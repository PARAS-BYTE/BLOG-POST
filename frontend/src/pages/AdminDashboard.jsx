import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  fetchAdminBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  generateAIBlog,
  cancelScheduledBlog,
  fetchAdmins,
  adminRegister,
  deleteAdminAccount,
  triggerCronPublish,
  fetchQueueStatus
} from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  BookOpen,
  CheckCircle,
  FileEdit,
  Search,
  X,
  Calendar,
  AlertTriangle,
  Eye,
  Sparkles,
  Wand2,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Send,
  AlertCircle,
  Users,
  Shield,
  Crown,
  LogOut,
  UserPlus,
  Play,
  RefreshCw
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
 * Get a default future datetime (e.g. 1 hour ahead rounded to 15 mins)
 */
function getDefaultFutureDatetime(hoursAhead = 1) {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toLocalDatetimeInputValue(d);
}

/**
 * AdminDashboard Page
 * Comprehensive management portal for SuperAdmins and Administrators:
 * - Automated post scheduling (zero human intervention)
 * - Cancel scheduling / Return to Draft
 * - Real-time queue status (Draft, Scheduled, Published, Failed, Processing)
 * - SuperAdmin team management (create and delete admin accounts)
 * - Groq AI Drafting Assistant
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Current session info
  const currentRole = localStorage.getItem('adminRole') || 'admin';
  const currentEmail = localStorage.getItem('adminEmail') || 'admin';
  const isSuperAdmin = currentRole === 'superadmin';

  // Blog list & loading states (strictly default to empty array)
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'FAILED'
  const [filterSearch, setFilterSearch] = useState('');

  // Toast feedback message
  const [toastMessage, setToastMessage] = useState('');

  // Modal State for Creating/Editing Blogs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [editBlogId, setEditBlogId] = useState(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [status, setStatus] = useState('Published'); // 'Draft' | 'Published' | 'Scheduled'
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [contentTab, setContentTab] = useState('write'); // 'write' | 'preview'

  // AI Assistant State (Powered by Groq)
  const [aiTopic, setAiTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Confirmation dialogs
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [cancelScheduleCandidate, setCancelScheduleCandidate] = useState(null);

  // SuperAdmin: Team Management Modal State
  const [isAdminTeamModalOpen, setIsAdminTeamModalOpen] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminModalError, setAdminModalError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // State for manual scheduler invocation
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);

  // Manual Trigger for Scheduler (Development & Testing)
  const handleManualCronTrigger = async () => {
    try {
      setIsTriggeringCron(true);
      const res = await triggerCronPublish();
      showToast(
        `Scheduler Executed: ${res.publishedCount || 0} published, ${res.failedCount || 0} failed (${res.durationMs || 0}ms)`
      );
      await loadBlogs();
    } catch (err) {
      console.error('Manual cron trigger error:', err);
      showToast(err.response?.data?.message || 'Failed to trigger cron scheduler.');
    } finally {
      setIsTriggeringCron(false);
    }
  };

  // Safe blog array extractor to guarantee .filter and .length are always valid
  const blogList = Array.isArray(blogs)
    ? blogs
    : (blogs && Array.isArray(blogs.blogs) ? blogs.blogs : []);

  // Fetch all blogs
  const loadBlogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminBlogs();
      if (Array.isArray(data)) {
        setBlogs(data);
      } else if (data && Array.isArray(data.blogs)) {
        setBlogs(data.blogs);
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.error('Error fetching admin blogs:', err);
      setBlogs([]);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load team admins (SuperAdmin only)
  const loadAdmins = async () => {
    if (!isSuperAdmin) return;
    try {
      setAdminListLoading(true);
      const data = await fetchAdmins();
      setAdminList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setAdminListLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Periodically refresh blog list so newly auto-published blogs appear automatically
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      // Background silent refresh
      fetchAdminBlogs()
        .then((data) => {
          if (Array.isArray(data)) setBlogs(data);
          else if (data && Array.isArray(data.blogs)) setBlogs(data.blogs);
        })
        .catch(() => {});
    }, 15000); // 15 seconds
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Open Modal in "Create" mode
  const openCreateModal = (defaultStatus = 'Published') => {
    setEditBlogId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setTags('');
    setConclusion('');
    setStatus(defaultStatus);
    setScheduledDateTime(defaultStatus === 'Scheduled' ? getDefaultFutureDatetime(1) : '');
    setContentTab('write');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // Open Modal in "Edit" mode with prefilled details
  const openEditModal = (blog) => {
    setEditBlogId(blog._id);
    setTitle(blog.title || '');
    setContent(blog.content || '');
    setImageUrl(blog.imageUrl || '');
    setTags(Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '');
    setConclusion(blog.conclusion || '');
    setStatus(blog.status || 'Draft');
    setScheduledDateTime(
      blog.scheduledAt ? toLocalDatetimeInputValue(blog.scheduledAt) : getDefaultFutureDatetime(1)
    );
    setContentTab('write');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // Quick Preset Handlers for Scheduling Date/Time
  const setPresetSchedule = (type) => {
    const d = new Date();
    if (type === '1h') {
      d.setHours(d.getHours() + 1);
    } else if (type === 'tomorrow-9am') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow-6pm') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    } else if (type === '2d') {
      d.setDate(d.getDate() + 2);
    }
    setScheduledDateTime(toLocalDatetimeInputValue(d));
  };

  // AI Content Generator
  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      setModalError('Please enter a topic or outline for the AI assistant.');
      return;
    }

    try {
      setIsAiGenerating(true);
      setModalError('');
      setAiSuccessMessage('');

      const result = await generateAIBlog(aiTopic.trim());

      if (result.title) setTitle(result.title);
      if (result.content) setContent(result.content);
      if (result.imageUrl) setImageUrl(result.imageUrl);
      if (result.tags) {
        setTags(Array.isArray(result.tags) ? result.tags.join(', ') : result.tags);
      }
      if (result.conclusion) setConclusion(result.conclusion);

      setAiSuccessMessage('AI Draft generated with cover image! Review and adjust values before saving.');
    } catch (err) {
      console.error('Failed to generate with AI:', err);
      setModalError(
        err.response?.data?.message || 'Failed to generate blog draft with AI. Please try again.'
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Save Blog (Draft, Published, or Scheduled)
  const handleSaveBlog = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!title.trim() || !content.trim() || !conclusion.trim()) {
      setModalError('Please fill in Title, Content, and Conclusion.');
      return;
    }

    let utcScheduledAt = null;

    if (status === 'Scheduled') {
      if (!scheduledDateTime) {
        setModalError('Please select a valid future date and time for scheduled publishing.');
        return;
      }

      const scheduledDate = new Date(scheduledDateTime);
      if (isNaN(scheduledDate.getTime())) {
        setModalError('Invalid date/time selected.');
        return;
      }

      if (scheduledDate.getTime() <= Date.now()) {
        setModalError('Scheduled time must be in the future.');
        return;
      }

      // Convert local date selection to UTC ISO string for MongoDB
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
        status: status,
        scheduledAt: utcScheduledAt
      };

      if (editBlogId) {
        await updateBlog(editBlogId, blogData);
        showToast(`Article "${title}" updated successfully.`);
      } else {
        await createBlog(blogData);
        showToast(
          status === 'Scheduled'
            ? `Article "${title}" scheduled! It will be published automatically when time arrives.`
            : status === 'Published'
            ? `Article "${title}" published live!`
            : `Article "${title}" saved as Draft.`
        );
      }

      setIsModalOpen(false);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to save blog:', err);
      setModalError(err.response?.data?.message || 'Failed to save blog. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Immediate Publish Now
  const handlePublishNow = async (blog) => {
    try {
      await updateBlog(blog._id, { status: 'Published' });
      showToast(`"${blog.title}" is now Published live!`);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to publish now:', err);
      alert(err.response?.data?.message || 'Could not publish article.');
    }
  };

  // Quick toggle between Published and Draft
  const handleToggleStatus = async (blog) => {
    try {
      const newStatus = blog.status === 'Published' ? 'Draft' : 'Published';
      await updateBlog(blog._id, { status: newStatus });
      showToast(`Status changed to ${newStatus}.`);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to change status:', err);
      alert('Could not update status.');
    }
  };

  // Cancel Scheduling Handler
  const confirmCancelSchedule = async () => {
    if (!cancelScheduleCandidate) return;
    try {
      await cancelScheduledBlog(cancelScheduleCandidate._id);
      showToast(`Scheduling cancelled for "${cancelScheduleCandidate.title}". Reverted to Draft.`);
      setCancelScheduleCandidate(null);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to cancel schedule:', err);
      alert(err.response?.data?.message || 'Could not cancel schedule.');
    }
  };

  // Delete Blog handler
  const confirmDeleteBlog = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteBlog(deleteCandidate._id);
      showToast(`Article deleted.`);
      setDeleteCandidate(null);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to delete blog:', err);
      alert('Could not delete blog.');
    }
  };

  // SuperAdmin: Create New Admin handler
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminModalError('');

    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      setAdminModalError('Please enter both email and password.');
      return;
    }

    try {
      setCreatingAdmin(true);
      await adminRegister({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        role: 'admin'
      });
      showToast(`Admin account ${newAdminEmail} created successfully!`);
      setNewAdminEmail('');
      setNewAdminPassword('');
      await loadAdmins();
    } catch (err) {
      setAdminModalError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // SuperAdmin: Delete Admin handler
  const handleDeleteAdmin = async (adminId, adminEmail) => {
    if (!window.confirm(`Are you sure you want to remove admin access for ${adminEmail}?`)) return;
    try {
      await deleteAdminAccount(adminId);
      showToast(`Admin ${adminEmail} removed.`);
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove admin.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminEmail');
    navigate('/admin/login');
  };

  // Compute Statistics safely from blogList
  const totalBlogs = blogList.length;
  const publishedCount = blogList.filter((b) => b.status === 'Published').length;
  const scheduledCount = blogList.filter((b) => b.status === 'Scheduled').length;
  const draftCount = blogList.filter((b) => b.status === 'Draft').length;
  const failedCount = blogList.filter((b) => b.status === 'Failed').length;

  // Filter blogs according to active tab and search query safely
  const filteredBlogs = blogList.filter((blog) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PUBLISHED'
        ? blog.status === 'Published'
        : activeTab === 'SCHEDULED'
        ? blog.status === 'Scheduled' || blog.status === 'Processing'
        : activeTab === 'DRAFT'
        ? blog.status === 'Draft'
        : activeTab === 'FAILED'
        ? blog.status === 'Failed'
        : true;

    const matchesSearch =
      filterSearch.trim() === ''
        ? true
        : (blog.title && blog.title.toLowerCase().includes(filterSearch.toLowerCase())) ||
          (blog.tags && blog.tags.some((t) => t.toLowerCase().includes(filterSearch.toLowerCase())));

    return matchesTab && matchesSearch;
  });

  // Admin Table Pagination
  const [adminPage, setAdminPage] = useState(1);
  const adminPageSize = 8;
  const totalAdminPages = Math.max(1, Math.ceil(filteredBlogs.length / adminPageSize));

  useEffect(() => {
    setAdminPage(1);
  }, [filterSearch, activeTab]);

  const paginatedBlogs = filteredBlogs.slice(
    (adminPage - 1) * adminPageSize,
    adminPage * adminPageSize
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Editorial CMS Dashboard
            </h1>

            {/* Current User Role Badge */}
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-amber-600" /> SuperAdmin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Shield className="w-3 h-3 text-blue-600" /> Admin
              </span>
            )}

            {/* Live Automated Publishing Indicator */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Publisher Active
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-700">{currentEmail}</strong>. Articles scheduled for a future time are automatically published without human intervention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SuperAdmin Only: Manage Team Admins Button */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setIsAdminTeamModalOpen(true);
                loadAdmins();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 px-3.5 py-2 rounded-lg transition shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" /> Manage Admins
            </button>
          )}

          {/* Manual Scheduler Trigger Button for Instant Testing */}
          <button
            onClick={handleManualCronTrigger}
            disabled={isTriggeringCron}
            title="Manually execute cron publisher now to test scheduled posts immediately without waiting for Vercel Cron"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isTriggeringCron ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                <span>Run Scheduler Now</span>
              </>
            )}
          </button>

          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-lg transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Public Site
          </Link>

          <button
            onClick={() => openCreateModal('Published')}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Article
          </button>

          <button
            onClick={handleLogout}
            title="Sign out of admin portal"
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics & Queue Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        
        {/* Total Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{totalBlogs}</div>
          </div>
        </div>

        {/* Published Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Published</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{publishedCount}</div>
          </div>
        </div>

        {/* Scheduled Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scheduled (Auto)</div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-0.5">{scheduledCount}</div>
          </div>
        </div>

        {/* Drafts & Failed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            failedCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {failedCount > 0 ? <AlertCircle className="w-5 h-5" /> : <FileEdit className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {failedCount > 0 ? 'Drafts / Failed' : 'Drafts'}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {draftCount}
              {failedCount > 0 && (
                <span className="text-rose-600 text-xs font-semibold ml-1.5">
                  ({failedCount} failed)
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Articles Management Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Filters & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalBlogs})
            </button>
            <button
              onClick={() => setActiveTab('PUBLISHED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'PUBLISHED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setActiveTab('SCHEDULED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                activeTab === 'SCHEDULED'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 text-indigo-500" />
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveTab('DRAFT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setActiveTab('FAILED')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer text-rose-700 ${
                  activeTab === 'FAILED'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-rose-600 hover:text-rose-900'
                }`}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>

          {/* Search within Admin */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Filter by title or tag..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

        </div>

        {/* Content Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading articles and scheduler status...</span>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-medium text-slate-700 mb-1">No articles match your criteria</p>
            <p className="text-xs text-slate-400 mb-4">
              Try adjusting your search filter, select a different tab, or create a new blog.
            </p>
            <button
              onClick={() => openCreateModal('Published')}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              + Create Article Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Article Details</th>
                  <th className="py-3.5 px-4">Status & Release Schedule</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedBlogs.map((blog) => {
                  const isScheduled = blog.status === 'Scheduled';
                  const isProcessing = blog.status === 'Processing';
                  const isPublished = blog.status === 'Published';
                  const isDraft = blog.status === 'Draft';
                  const isFailed = blog.status === 'Failed';

                  // Calculate if a scheduled post is past due and will publish on next automatic tick
                  const isPastDue = isScheduled && blog.scheduledAt && new Date(blog.scheduledAt).getTime() <= Date.now();

                  return (
                    <tr key={blog._id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Thumbnail + Title & Tags */}
                      <td className="py-4 px-4 sm:px-6 max-w-sm">
                        <div className="flex items-center gap-3">
                          {blog.imageUrl ? (
                            <img
                              src={blog.imageUrl}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 border border-slate-200">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                              {blog.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {blog.tags && blog.tags.length > 0 ? (
                                blog.tags.map((t, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                                  >
                                    #{t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400">No tags</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge & Scheduling Meta */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isPublished && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Published
                          </span>
                        )}

                        {isScheduled && (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Clock className="w-3 h-3 text-indigo-500 animate-pulse" />
                              Scheduled (Auto-Publishing)
                            </span>
                            {isPastDue ? (
                              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                Due (publishing automatically...)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                at {new Date(blog.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({userTimezone.split('/')[1] || userTimezone})
                              </span>
                            )}
                          </div>
                        )}

                        {isProcessing && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            Auto-Processing...
                          </span>
                        )}

                        {isDraft && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Draft
                          </span>
                        )}

                        {isFailed && (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              Publish Failed
                            </span>
                            {blog.failureReason && (
                              <span className="text-[10px] text-rose-600 max-w-xs truncate" title={blog.failureReason}>
                                {blog.failureReason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dates Column */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                        {isScheduled && blog.scheduledAt ? (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              {new Date(blog.scheduledAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              UTC: {new Date(blog.scheduledAt).toISOString().replace('.000Z', 'Z')}
                            </span>
                          </div>
                        ) : isPublished && blog.publishedAt ? (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              {new Date(blog.publishedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Published Date
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(blog.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400">Created Date</span>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          
                          {/* Quick Publish Now for Scheduled or Draft posts */}
                          {(isScheduled || isDraft) && (
                            <button
                              onClick={() => handlePublishNow(blog)}
                              title="Publish this article immediately without waiting for scheduled time"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition cursor-pointer flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Publish Now
                            </button>
                          )}

                          {/* Cancel Schedule button for Scheduled posts */}
                          {isScheduled && (
                            <button
                              onClick={() => setCancelScheduleCandidate(blog)}
                              title="Cancel scheduled publishing and return to Draft"
                              className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Cancel Schedule
                            </button>
                          )}

                          {/* View public page if published */}
                          {isPublished && (
                            <Link
                              to={`/blog/${blog._id}`}
                              target="_blank"
                              title="View live published page"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Toggle Draft / Published for Published posts */}
                          {isPublished && (
                            <button
                              onClick={() => handleToggleStatus(blog)}
                              title="Unpublish to Draft"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Article */}
                          <button
                            onClick={() => openEditModal(blog)}
                            title="Edit article details and schedule"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Article */}
                          <button
                            onClick={() => setDeleteCandidate(blog)}
                            title="Delete article"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalAdminPages > 1 && (
              <div className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <strong className="text-slate-800 font-semibold">{(adminPage - 1) * adminPageSize + 1}</strong> to{' '}
                  <strong className="text-slate-800 font-semibold">{Math.min(adminPage * adminPageSize, filteredBlogs.length)}</strong> of{' '}
                  <strong className="text-slate-800 font-semibold">{filteredBlogs.length}</strong> articles
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={adminPage === 1}
                    onClick={() => setAdminPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAdminPage(p)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition cursor-pointer ${
                          p === adminPage
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={adminPage === totalAdminPages}
                    onClick={() => setAdminPage((prev) => Math.min(totalAdminPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* CREATE / EDIT BLOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editBlogId ? 'Edit Article' : 'Create New Article'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure article content and future release schedule. The post will automatically publish when the scheduled time arrives.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI BLOG DRAFT ASSISTANT BOX */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 rounded-xl p-4 mb-5 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Generate Draft with AI (Powered by Groq)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                Provide a topic or brief summary. The AI will populate Title, Content, Cover Image, Tags, and Conclusion for you to review and edit before saving.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g., Implementing Resilient Serverless Schedulers with MongoDB"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  disabled={isAiGenerating}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={isAiGenerating}
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Drafting with AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Generate Draft
                    </>
                  )}
                </button>
              </div>

              {aiSuccessMessage && (
                <div className="mt-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{aiSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Error Message inside modal */}
            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3 mb-4">
                {modalError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveBlog} className="space-y-4">
              
              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Understanding Modern Distributed Systems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Cover Image URL Input with Live Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Cover Image URL
                  </label>
                  <span className="text-[11px] text-slate-400">Direct image link (Unsplash, CDN)</span>
                </div>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-1518770660439-4636190af475..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
                {imageUrl && (
                  <div className="mt-2 relative h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={imageUrl}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="absolute bottom-1 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                      Cover Preview
                    </span>
                  </div>
                )}
              </div>

              {/* Main Content with Write / Live Preview Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Main Content / Body * <span className="text-[11px] text-blue-600 font-normal lowercase">(Markdown supported)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setContentTab('write')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                        contentTab === 'write'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab('preview')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                        contentTab === 'preview'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Live Preview
                    </button>
                  </div>
                </div>

                {contentTab === 'write' ? (
                  <>
                    <textarea
                      required
                      rows={6}
                      placeholder="Write using Markdown (## Headings, **bold**, - bullet lists, ```code```)..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed font-mono"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>Supports <strong>##</strong> headings, <strong>**bold**</strong>, lists, and code blocks.</span>
                      <span>{content ? content.split(/\s+/).filter(Boolean).length : 0} words</span>
                    </div>
                  </>
                ) : (
                  <div className="min-h-[160px] max-h-[280px] overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    {content.trim() ? (
                      <MarkdownRenderer content={content} />
                    ) : (
                      <p className="text-slate-400 italic text-sm text-center py-8">
                        No content written yet. Switch to "Write" tab or generate with AI to see live preview.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Tags / Keywords
                  </label>
                  <span className="text-[11px] text-slate-400">Separate with commas</span>
                </div>
                <input
                  type="text"
                  placeholder="React, Architecture, Node.js"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Conclusion Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Conclusion & Key Takeaways *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Summarize the core insights of this article..."
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Publication / Scheduling Action Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Publishing & Release Options
                </label>

                {/* 3 Action Radios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* Option: Save as Draft */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      status === 'Draft'
                        ? 'bg-amber-50/80 border-amber-300 text-amber-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="postStatus"
                      value="Draft"
                      checked={status === 'Draft'}
                      onChange={() => setStatus('Draft')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-semibold">Save as Draft</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Keep in admin portal only</div>
                    </div>
                  </label>

                  {/* Option: Publish Now */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      status === 'Published'
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="postStatus"
                      value="Published"
                      checked={status === 'Published'}
                      onChange={() => setStatus('Published')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-semibold">Publish Now</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Live immediately for public</div>
                    </div>
                  </label>

                  {/* Option: Schedule Post */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      status === 'Scheduled'
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="postStatus"
                      value="Scheduled"
                      checked={status === 'Scheduled'}
                      onChange={() => {
                        setStatus('Scheduled');
                        if (!scheduledDateTime) {
                          setScheduledDateTime(getDefaultFutureDatetime(1));
                        }
                      }}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" /> Schedule Post
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Auto-release at selected time</div>
                    </div>
                  </label>

                </div>

                {/* Date & Time Picker Controls (Visible when status === 'Scheduled') */}
                {status === 'Scheduled' && (
                  <div className="mt-3 p-3.5 bg-white border border-indigo-200 rounded-lg space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Select Scheduled Date & Time
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Local Timezone: <strong className="text-slate-700">{userTimezone}</strong>
                      </span>
                    </div>

                    <input
                      type="datetime-local"
                      required={status === 'Scheduled'}
                      min={toLocalDatetimeInputValue(new Date())}
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule('1h')}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule('tomorrow-9am')}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        Tomorrow 9:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule('tomorrow-6pm')}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        Tomorrow 6:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule('2d')}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        +2 Days
                      </button>
                    </div>

                    {/* Timezone & UTC Preview Info Banner */}
                    {scheduledDateTime && (
                      <div className="text-[11px] bg-indigo-50/70 border border-indigo-100 rounded-md p-2.5 text-indigo-900 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Local Time:</span>
                          <span className="font-semibold">
                            {new Date(scheduledDateTime).toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-700">
                          <span>UTC Stored in MongoDB:</span>
                          <span className="font-mono text-[10px]">
                            {new Date(scheduledDateTime).toISOString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    status === 'Scheduled'
                      ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
                      : status === 'Draft'
                      ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : editBlogId ? (
                    status === 'Scheduled' ? 'Update & Schedule' : 'Update Article'
                  ) : status === 'Scheduled' ? (
                    <>
                      <Clock className="w-3.5 h-3.5" /> Schedule Post
                    </>
                  ) : status === 'Draft' ? (
                    'Save Draft'
                  ) : (
                    'Publish Now'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CANCEL SCHEDULE CONFIRMATION MODAL */}
      {cancelScheduleCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Cancel Scheduled Publishing?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This will cancel the scheduled release for{' '}
              <strong className="text-slate-800">"{cancelScheduleCandidate.title}"</strong> and revert the post back to a <strong className="text-amber-700">Draft</strong>.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCancelScheduleCandidate(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
              >
                Keep Scheduled
              </button>
              <button
                onClick={confirmCancelSchedule}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition cursor-pointer"
              >
                Revert to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BLOG CONFIRMATION DIALOG */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Article?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-800">"{deleteCandidate.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBlog}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPERADMIN ONLY: ADMIN TEAM MANAGEMENT MODAL */}
      {isAdminTeamModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Administrator Team Management</h3>
                  <p className="text-xs text-slate-500">Only the SuperAdmin can invite or manage admin accounts.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create New Admin Form */}
            <form onSubmit={handleCreateAdmin} className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" /> Create New Admin Account
              </div>

              {adminModalError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  {adminModalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="admin-email@utsanova.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  required
                  placeholder="New Admin Password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {creatingAdmin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Add Admin Account'
                  )}
                </button>
              </div>
            </form>

            {/* Existing Admins List */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Existing Administrators ({adminList.length})
              </div>

              {adminListLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading admin accounts...</div>
              ) : adminList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No admin accounts found.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                  {adminList.map((adm) => (
                    <div key={adm._id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">{adm.email}</div>
                        <div className="text-[10px] text-slate-400">
                          Joined: {new Date(adm.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {adm.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3 text-amber-600" /> SuperAdmin
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <Shield className="w-3 h-3 text-blue-600" /> Admin
                            </span>
                            <button
                              onClick={() => handleDeleteAdmin(adm._id, adm.email)}
                              title="Delete admin account"
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsAdminTeamModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}