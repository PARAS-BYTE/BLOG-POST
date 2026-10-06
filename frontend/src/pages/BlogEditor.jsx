import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  createBlog,
  updateBlog,
  fetchBlogById,
  generateAIBlog,
  fetchCurrentUser
} from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ImageDropzone from '../components/ImageDropzone';
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileEdit,
  Eye,
  Columns,
  Save,
  Send,
  Tag,
  Lock,
  Loader2,
  RefreshCw,
  X,
  ExternalLink,
  BookOpen,
  SlidersHorizontal,
  Compass,
  Check
} from 'lucide-react';

/**
 * Format date/time to local datetime-local input string (YYYY-MM-DDTHH:mm)
 */
function toLocalDatetimeInputValue(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get a default future datetime (e.g. 1 hour ahead rounded to nearest 15 mins)
 */
function getDefaultFutureDatetime(hoursAhead = 1) {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toLocalDatetimeInputValue(d);
}

/**
 * Standalone, Fully-Responsive Article Composition & Editing Page
 * Provides a dedicated, distraction-free environment for authors and SuperAdmins:
 * - Rich Title, Tags, and Conclusion inputs
 * - Integrated Cloudinary Drag-and-Drop Image Uploader
 * - Side-by-Side or Tabbed Live Markdown Composition
 * - Groq AI Drafting Assistant
 * - Automated Scheduler configuration with local timezone detection
 * - Granular RBAC permission enforcement
 */
export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Current session & permissions
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('adminRole') || 'admin');
  const [userPermissions, setUserPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('adminPermissions');
      return saved ? JSON.parse(saved) : {
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true,
        canScheduleBlog: true
      };
    } catch {
      return {
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true,
        canScheduleBlog: true
      };
    }
  });

  const isSuperAdmin = currentRole === 'superadmin';
  const canCreate = isSuperAdmin || Boolean(userPermissions?.canCreateBlog);
  const canEdit = isSuperAdmin || Boolean(userPermissions?.canEditBlog);
  const canUseAI = isSuperAdmin || Boolean(userPermissions?.canUseAI);
  const canSchedule = isSuperAdmin || Boolean(userPermissions?.canScheduleBlog);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [status, setStatus] = useState('Published'); // 'Draft' | 'Published' | 'Scheduled'
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // UI state
  const [editorMode, setEditorMode] = useState('split'); // 'split' (desktop) | 'write' | 'preview'
  const [loadingBlog, setLoadingBlog] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // AI Assistant State
  const [aiTopic, setAiTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Sync user profile permissions on mount
  useEffect(() => {
    const syncProfile = async () => {
      try {
        const profile = await fetchCurrentUser();
        if (profile.role) {
          setCurrentRole(profile.role);
          localStorage.setItem('adminRole', profile.role);
        }
        if (profile.permissions) {
          setUserPermissions(profile.permissions);
          localStorage.setItem('adminPermissions', JSON.stringify(profile.permissions));
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
        }
      }
    };
    syncProfile();
  }, [navigate]);

  // If in edit mode, fetch existing article
  useEffect(() => {
    if (!isEditing) {
      setScheduledDateTime(getDefaultFutureDatetime(1));
      return;
    }

    const loadArticle = async () => {
      try {
        setLoadingBlog(true);
        const data = await fetchBlogById(id);
        if (data) {
          setTitle(data.title || '');
          setContent(data.content || '');
          setImageUrl(data.imageUrl || '');
          setTags(Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''));
          setConclusion(data.conclusion || '');
          setStatus(data.status === 'Processing' ? 'Scheduled' : (data.status || 'Draft'));
          if (data.scheduledAt) {
            setScheduledDateTime(toLocalDatetimeInputValue(data.scheduledAt));
          } else {
            setScheduledDateTime(getDefaultFutureDatetime(1));
          }
        }
      } catch (err) {
        console.error('Failed to load article for edit:', err);
        setFormError('Failed to load article details. Please return to dashboard.');
      } finally {
        setLoadingBlog(false);
      }
    };

    loadArticle();
  }, [id, isEditing]);

  // AI Generation Handler (Powered by Groq)
  const handleGenerateWithAI = async () => {
    if (!canUseAI) {
      setFormError('Permission Denied: You do not have authorization to generate drafts with AI.');
      return;
    }

    if (!aiTopic.trim()) {
      setFormError('Please enter a topic or brief summary for the AI drafting engine.');
      return;
    }

    try {
      setIsAiGenerating(true);
      setFormError('');
      setAiSuccessMessage('');

      const result = await generateAIBlog(aiTopic.trim());

      if (result.title) setTitle(result.title);
      if (result.content) setContent(result.content);
      if (result.imageUrl && !imageUrl) setImageUrl(result.imageUrl);
      if (result.tags) {
        setTags(Array.isArray(result.tags) ? result.tags.join(', ') : result.tags);
      }
      if (result.conclusion) setConclusion(result.conclusion);

      setAiSuccessMessage('AI Draft generated successfully! You can refine and polish any section.');
    } catch (err) {
      console.error('AI drafting failed:', err);
      setFormError(err.response?.data?.message || 'Failed to generate draft with AI.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Quick Scheduling Helpers
  const setQuickScheduleHours = (hours) => {
    setScheduledDateTime(getDefaultFutureDatetime(hours));
    setStatus('Scheduled');
  };

  // Save Blog Handler
  const handleSaveBlog = async (overrideStatus = null) => {
    setFormError('');
    const targetStatus = overrideStatus || status;

    if (!isEditing && !canCreate) {
      setFormError('Permission Denied: You do not have permission to create articles.');
      return;
    }

    if (isEditing && !canEdit) {
      setFormError('Permission Denied: You do not have permission to edit articles.');
      return;
    }

    if (targetStatus === 'Scheduled' && !canSchedule) {
      setFormError('Permission Denied: You do not have permission to schedule articles.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please provide an article title.');
      return;
    }

    if (!content.trim()) {
      setFormError('Please provide content for the article.');
      return;
    }

    if (!conclusion.trim()) {
      setFormError('Please provide an executive conclusion / summary.');
      return;
    }

    let utcScheduledAt = null;

    if (targetStatus === 'Scheduled') {
      if (!scheduledDateTime) {
        setFormError('Please choose a valid future date and time for scheduled publishing.');
        return;
      }

      const scheduledDate = new Date(scheduledDateTime);
      if (isNaN(scheduledDate.getTime())) {
        setFormError('Invalid date/time selected.');
        return;
      }

      if (scheduledDate.getTime() <= Date.now()) {
        setFormError('Scheduled time must be set in the future.');
        return;
      }

      utcScheduledAt = scheduledDate.toISOString();
    }

    try {
      setSaving(true);
      const blogData = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        tags: tags,
        conclusion: conclusion.trim(),
        status: targetStatus,
        scheduledAt: utcScheduledAt
      };

      if (isEditing) {
        await updateBlog(id, blogData);
      } else {
        await createBlog(blogData);
      }

      // Route back with success
      navigate(isSuperAdmin ? '/superadmin/dashboard' : '/admin/dashboard');
    } catch (err) {
      console.error('Failed to save article:', err);
      setFormError(err.response?.data?.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  // Writing metrics calculation
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Parsed tag list for preview
  const parsedTagsList = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const suggestedTags = ['Engineering', 'Architecture', 'AI', 'FullStack', 'DevOps', 'Cloudinary', 'MongoDB'];

  const addSuggestedTag = (tag) => {
    if (parsedTagsList.includes(tag)) return;
    const updated = parsedTagsList.length ? `${tags}, ${tag}` : tag;
    setTags(updated);
  };

  if (loadingBlog) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold">Loading article details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* ====================================================
          TOP MASTER ACTION BAR (RESPONSIVE STICKY HEADER)
          ==================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Navigation & Title */}
          <div className="flex items-center gap-3">
            <Link
              to={isSuperAdmin ? '/superadmin/dashboard' : '/admin/dashboard'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 shadow-2xs"
              title="Return to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {isEditing ? 'Edit Article' : 'Compose New Article'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    status === 'Published'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : status === 'Scheduled'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Markdown-enabled rich editor • Direct Cloudinary image cloud serving
              </p>
            </div>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Save as Draft Button */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveBlog('Draft')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            {/* If Scheduled selected or quick Schedule */}
            {status === 'Scheduled' ? (
              <button
                type="button"
                disabled={saving || !canSchedule}
                onClick={() => handleSaveBlog('Scheduled')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>Schedule Release</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || (!isEditing && !canCreate) || (isEditing && !canEdit)}
                onClick={() => handleSaveBlog('Published')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Publish Now</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* ====================================================
          PAGE MAIN WORKSPACE CONTAINER
          ==================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Error Notification */}
        {formError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              onClick={() => setFormError('')}
              className="text-rose-400 hover:text-rose-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Success Feedback */}
        {aiSuccessMessage && (
          <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-xs animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{aiSuccessMessage}</span>
            <button
              onClick={() => setAiSuccessMessage('')}
              className="text-emerald-500 hover:text-emerald-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ====================================================
              LEFT COLUMN: MAIN ARTICLE COMPOSITION (COL 8)
              ==================================================== */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Article Title Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Article Title *
                </label>
                <span className="text-[11px] text-slate-400">
                  {title.length} characters
                </span>
              </div>
              <input
                type="text"
                required
                placeholder="e.g., Architecting Resilient Background Workers with Node.js & MongoDB"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition placeholder-slate-400"
              />
            </div>

            {/* 2. Cover Image Cloudinary Dropzone Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <ImageDropzone
                value={imageUrl}
                onChange={setImageUrl}
                label="Cover Image (Cloudinary Cloud Hosted)"
              />
            </div>

            {/* 3. Main Content Markdown Workspace Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              
              {/* Editor Header & View Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Article Body / Content *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Full Markdown support (headers, lists, tables, code blocks)
                  </span>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setEditorMode('write')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      editorMode === 'write'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Write</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      editorMode === 'preview'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  {/* Split Screen Mode (Best on desktop) */}
                  <button
                    type="button"
                    onClick={() => setEditorMode('split')}
                    className={`hidden md:flex px-3 py-1.5 rounded-lg font-semibold transition items-center gap-1.5 cursor-pointer ${
                      editorMode === 'split'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Side-by-side write and preview"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split Screen</span>
                  </button>
                </div>
              </div>

              {/* View Layout Render */}
              {editorMode === 'split' ? (
                /* Split Screen: Monospace textarea on left, Live Rendered Markdown on right */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                      Markdown Source
                    </span>
                    <textarea
                      rows={20}
                      required
                      placeholder="Write your article in Markdown here...&#10;&#10;## Introduction&#10;Share your insights with clarity...&#10;&#10;```javascript&#10;// code sample&#10;```"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed resize-y transition min-h-[450px]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                      Live Rendered Preview
                    </span>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl min-h-[450px] max-h-[600px] overflow-y-auto prose prose-slate prose-sm max-w-none">
                      {content.trim() ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-slate-400 italic text-xs">
                          Live rendered preview will appear here as you write...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : editorMode === 'write' ? (
                /* Write Only Mode */
                <textarea
                  rows={20}
                  required
                  placeholder="Write your article in Markdown here...&#10;&#10;## Introduction&#10;Share your insights with clarity...&#10;&#10;```javascript&#10;// code sample&#10;```"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed resize-y transition min-h-[450px]"
                />
              ) : (
                /* Preview Only Mode */
                <div className="p-6 bg-white border border-slate-200 rounded-xl min-h-[450px] prose prose-slate max-w-none">
                  {content.trim() ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-slate-400 italic text-sm">
                      Article body is currently empty.
                    </p>
                  )}
                </div>
              )}

              {/* Bottom editor metrics */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                <span>{wordCount} words • {readingTime} min read</span>
                <span className="text-slate-400 font-mono">UTF-8 Encoded</span>
              </div>
            </div>

            {/* 4. Executive Conclusion / Takeaways Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Executive Conclusion / Key Takeaways *
                </label>
                <span className="text-[11px] text-slate-400">
                  Required summary for reader engagement
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Summarize the core learnings and actionable recommendations..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition resize-y"
              />
            </div>

          </div>

          {/* ====================================================
              RIGHT COLUMN: INTELLIGENCE & PUBLISHING (COL 4)
              ==================================================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Groq AI Drafting Assistant */}
            <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Groq AI Drafting Assistant
                  </h3>
                  <span className="text-[10px] text-slate-500">Fast Llama 3 Inference</span>
                </div>
              </div>

              {!canUseAI ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs flex items-center gap-2 mt-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>AI Drafting authorization is restricted. Contact SuperAdmin to grant access.</span>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Provide a topic or concept. AI will auto-populate title, markdown body, cover image suggestion, tags, and conclusion.
                  </p>

                  <input
                    type="text"
                    placeholder="e.g., Scaling Redis with Distributed Caching"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    disabled={isAiGenerating}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />

                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isAiGenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Drafting with AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Generate Draft with AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Publishing & Schedule Release Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Publishing Status
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {userTimezone}
                </span>
              </div>

              {/* Status Radio Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Published', label: 'Live', desc: 'Public now' },
                  { id: 'Scheduled', label: 'Schedule', desc: 'Auto cron' },
                  { id: 'Draft', label: 'Draft', desc: 'Private' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col ${
                      status === s.id
                        ? 'bg-blue-50/70 border-blue-500 text-blue-900 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs">{s.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>

              {/* Scheduled Date/Time Configuration (if Scheduled) */}
              {status === 'Scheduled' && (
                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      Target Release Time
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium">
                      Zero human intervention
                    </span>
                  </div>

                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-medium"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setQuickScheduleHours(1)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 rounded-md transition"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickScheduleHours(24)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 rounded-md transition"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickScheduleHours(168)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 rounded-md transition"
                    >
                      +1 Week
                    </button>
                  </div>

                  <p className="text-[10px] text-purple-700 leading-relaxed">
                    • The system scheduler runs every 10 minutes via cron to publish due posts autonomously.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Article Tags & Classification Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Article Tags
                </label>
                <Tag className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <input
                type="text"
                placeholder="DistributedSystems, Cloudinary, Node"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />

              {/* Tag Chips Preview */}
              {parsedTagsList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {parsedTagsList.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Tags Quick Add */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Suggested Tags (Click to Add)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {suggestedTags.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => addSuggestedTag(st)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    >
                      +{st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Publishing Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Article Summary
              </span>

              <div className="text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Author:</span>
                  <strong className="text-slate-900">{isSuperAdmin ? 'SuperAdmin' : 'Administrator'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Word Count:</span>
                  <strong className="text-slate-900">{wordCount} words</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Est. Read Time:</span>
                  <strong className="text-slate-900">{readingTime} min</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cover Image:</span>
                  <strong className={imageUrl ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {imageUrl ? 'Attached' : 'None'}
                  </strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
