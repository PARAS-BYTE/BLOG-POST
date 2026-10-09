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

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // Current session & permissions
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('adminRole') || 'admin');
  const [userPermissions, setUserPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('adminPermissions');
      return saved ? JSON.parse(saved) : {
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true
      };
    } catch {
      return {
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true
      };
    }
  });

  const isSuperAdmin = currentRole === 'superadmin';
  const canCreate = isSuperAdmin || Boolean(userPermissions?.canCreateBlog);
  const canEdit = isSuperAdmin || Boolean(userPermissions?.canEditBlog);
  const canUseAI = isSuperAdmin || Boolean(userPermissions?.canUseAI);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [status, setStatus] = useState('Published'); // 'Draft' | 'Published'

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
    if (!isEditing) return;

    const loadArticle = async () => {
      try {
        setLoadingBlog(true);
        const data = await fetchBlogById(id);
        if (data) {
          setTitle(data.title || '');
          setContent(data.content || '');
          const loadedImages = Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : (data.imageUrl ? [data.imageUrl] : []);
          setImages(loadedImages);
          setImageUrl(data.imageUrl || (loadedImages[0] || ''));
          setTags(Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''));
          setConclusion(data.conclusion || '');
          setStatus(data.status || 'Draft');
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
      if (result.imageUrl && !imageUrl) {
        setImageUrl(result.imageUrl);
        setImages((prev) => (prev.length === 0 ? [result.imageUrl] : prev));
      }
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

    try {
      setSaving(true);
      const primaryImage = imageUrl.trim() || (images.length > 0 ? images[0] : '');
      const blogData = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: primaryImage,
        images: images.length > 0 ? images : (primaryImage ? [primaryImage] : []),
        tags: tags,
        conclusion: conclusion.trim(),
        status: targetStatus
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

  // Writing metrics calculation (Feature 4: Character / Word Counter)
  const characterCount = content.length;
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
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold">Loading article details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 transition-colors">
      
      {/* ====================================================
          TOP MASTER ACTION BAR (RESPONSIVE STICKY HEADER)
          ==================================================== */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Navigation & Title */}
          <div className="flex items-center gap-3">
            <Link
              to={isSuperAdmin ? '/superadmin/dashboard' : '/admin/dashboard'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="Return to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {isEditing ? 'Edit Article' : 'Compose New Article'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    status === 'Published'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Markdown-enabled rich editor • Multiple picture gallery & Cloudinary cloud serving
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Save Draft</span>
            </button>

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

          </div>

        </div>
      </header>

      {/* ====================================================
          PAGE MAIN WORKSPACE CONTAINER
          ==================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Error Notification */}
        {formError && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              onClick={() => setFormError('')}
              className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Success Feedback */}
        {aiSuccessMessage && (
          <div className="mb-5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl flex items-center gap-2 shadow-xs animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{aiSuccessMessage}</span>
            <button
              onClick={() => setAiSuccessMessage('')}
              className="text-emerald-500 hover:text-emerald-800 p-1 cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
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
                className="w-full px-4 py-3 text-base sm:text-lg font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 transition placeholder-slate-400"
              />
            </div>

            {/* 2. Cover Image & Multiple Article Pictures Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <ImageDropzone
                value={imageUrl}
                onChange={setImageUrl}
                images={images}
                onChangeImages={setImages}
                onInsertMarkdown={(markdown) => setContent((prev) => prev ? `${prev}\n\n${markdown}\n` : markdown)}
                label="Article Pictures & Cover Image (Support for Multiple Photos)"
              />
            </div>

            {/* 3. Main Content Markdown Workspace Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              
              {/* Editor Header & View Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Article Body / Content *
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Full Markdown support (headers, lists, tables, code blocks, images)
                  </span>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setEditorMode('write')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      editorMode === 'write'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">
                      Markdown Source
                    </span>
                    <textarea
                      rows={20}
                      required
                      placeholder="Write your article in Markdown here...&#10;&#10;## Introduction&#10;Share your insights with clarity...&#10;&#10;```javascript&#10;// code sample&#10;```"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 leading-relaxed resize-y transition min-h-[450px]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">
                      Live Rendered Preview
                    </span>
                    <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[450px] max-h-[600px] overflow-y-auto prose prose-slate dark:prose-invert prose-sm max-w-none">
                      {content.trim() ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500 italic text-xs">
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
                  className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 leading-relaxed resize-y transition min-h-[450px]"
                />
              ) : (
                /* Preview Only Mode */
                <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[450px] prose prose-slate dark:prose-invert max-w-none">
                  {content.trim() ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic text-sm">
                      Article body is currently empty.
                    </p>
                  )}
                </div>
              )}

              {/* Feature 4: Live Character & Word Counter bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{characterCount.toLocaleString()}</strong> characters
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{wordCount.toLocaleString()}</strong> words
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    ~{readingTime} min read
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800">
                  Live Counter
                </span>
              </div>
            </div>

            {/* 4. Executive Conclusion / Takeaways Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Executive Conclusion / Key Takeaways *
                </label>
                <span className="text-[11px] text-slate-400">
                  {conclusion.length} chars • {conclusion.trim() ? conclusion.trim().split(/\s+/).length : 0} words
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Summarize the core learnings and actionable recommendations..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 transition resize-y"
              />
            </div>

          </div>

          {/* ====================================================
              RIGHT COLUMN: INTELLIGENCE & PUBLISHING (COL 4)
              ==================================================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Groq AI Drafting Assistant */}
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Groq AI Drafting Assistant
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Fast Llama 3 Inference</span>
                </div>
              </div>

              {!canUseAI ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 mt-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>AI Drafting authorization is restricted. Contact SuperAdmin to grant access.</span>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Provide a topic or concept. AI will auto-populate title, markdown body, cover image suggestion, tags, and conclusion.
                  </p>

                  <input
                    type="text"
                    placeholder="e.g., Scaling Redis with Distributed Caching"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    disabled={isAiGenerating}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
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

            {/* 2. Publishing Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Publishing Status
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>

              {/* Status Radio Pills */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Published', label: 'Live / Public', desc: 'Visible to readers' },
                  { id: 'Draft', label: 'Private Draft', desc: 'Only visible to team' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col ${
                      status === s.id
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-300 font-bold shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs">{s.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Article Tags & Classification Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Article Tags
                </label>
                <Tag className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <input
                type="text"
                placeholder="DistributedSystems, Cloudinary, Node"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
              />

              {/* Tag Chips Preview */}
              {parsedTagsList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {parsedTagsList.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Tags Quick Add */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  Suggested Tags (Click to Add)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {suggestedTags.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => addSuggestedTag(st)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    >
                      +{st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Publishing Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Article Summary
              </span>

              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Author:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{isSuperAdmin ? 'SuperAdmin' : 'Administrator'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Characters:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{characterCount.toLocaleString()}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Word Count:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{wordCount.toLocaleString()} words</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Est. Read Time:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{readingTime} min</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pictures:</span>
                  <strong className={images.length > 0 || imageUrl ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                    {images.length > 0 ? `${images.length} attached` : (imageUrl ? '1 attached' : 'None')}
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
