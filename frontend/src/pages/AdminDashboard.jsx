import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  fetchAdminBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  generateAIBlog,
  fetchAdmins,
  adminRegister,
  deleteAdminAccount,
  fetchCurrentUser,
  updateAdminPermissions,
  toggleAdminStatus,
  changePassword
} from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ImageDropzone from '../components/ImageDropzone';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
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
  Key,
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
  RefreshCw,
  Lock,
  Unlock,
  Ban,
  Check,
  SlidersHorizontal,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX
} from 'lucide-react';

/**
 * AdminDashboard Page
 * Comprehensive management portal for SuperAdmins and Administrators:
 * - Direct Article Authoring & Editing with Cloudinary Image Cloud
 * - SuperAdmin team management & granular RBAC privileges
 * - Groq AI Drafting Assistant
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Current session info
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('adminRole') || 'admin');
  const currentEmail = localStorage.getItem('adminEmail') || 'admin';
  const isSuperAdmin = currentRole === 'superadmin';

  // Granular permissions for logged-in admin
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

  // Modal to inspect own permissions (for regular admins)
  const [isMyPermissionsModalOpen, setIsMyPermissionsModalOpen] = useState(false);

  // Effective permissions: SuperAdmin has unrestricted access; admins check their granted permissions
  const canCreate = isSuperAdmin || Boolean(userPermissions?.canCreateBlog);
  const canEdit = isSuperAdmin || Boolean(userPermissions?.canEditBlog);
  const canDelete = isSuperAdmin || Boolean(userPermissions?.canDeleteBlog);
  const canUseAI = isSuperAdmin || Boolean(userPermissions?.canUseAI);

  // Blog list & loading states (strictly default to empty array)
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT'
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
  const [status, setStatus] = useState('Published'); // 'Draft' | 'Published'
  const [contentTab, setContentTab] = useState('write'); // 'write' | 'preview'

  // AI Assistant State (Powered by Groq)
  const [aiTopic, setAiTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Confirmation dialogs
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // SuperAdmin: Team Management Modal State
  const [isAdminTeamModalOpen, setIsAdminTeamModalOpen] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState({
    canCreateBlog: true,
    canEditBlog: true,
    canDeleteBlog: true,
    canUseAI: true
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminModalError, setAdminModalError] = useState('');
  const [updatingAdminId, setUpdatingAdminId] = useState(null);

  // Self-Service Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [passwordModalError, setPasswordModalError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordModalError('');

    if (!currentPasswordInput) {
      setPasswordModalError('Current password is required.');
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordModalError('New password must be at least 6 characters long.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setPasswordModalError('New passwords do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await changePassword(currentPasswordInput, newPasswordInput);
      showToast('Password changed successfully!');
      setIsPasswordModalOpen(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordModalError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
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

  // Sync current user's active permissions and revocation status from server
  useEffect(() => {
    const syncUserSession = async () => {
      try {
        const profile = await fetchCurrentUser();
        if (profile.status === 'revoked' || profile.isActive === false) {
          alert('Your administrator account access has been revoked by the SuperAdministrator.');
          handleLogout();
          return;
        }
        if (profile.permissions) {
          setUserPermissions(profile.permissions);
          localStorage.setItem('adminPermissions', JSON.stringify(profile.permissions));
        }
        if (profile.role) {
          setCurrentRole(profile.role);
          localStorage.setItem('adminRole', profile.role);
        }
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.isRevoked) {
          alert('Your administrator account access has been revoked by the SuperAdministrator.');
          handleLogout();
        }
      }
    };

    syncUserSession();
  }, []);

  useEffect(() => {
    loadBlogs();
  }, []);

  // Periodically refresh blog list and trigger due posts when viewing dashboard
  useEffect(() => {
    const autoRefreshInterval = setInterval(async () => {
      try {
        const data = await fetchAdminBlogs();
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.blogs) ? data.blogs : []);
        setBlogs(list);
      } catch (err) {
        // Silent background refresh
      }
    }, 15000); // 15 seconds
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Open Modal in "Create" mode
  const openCreateModal = (defaultStatus = 'Published') => {
    if (!canCreate) {
      showToast('Permission Denied: You do not have permission to create articles.');
      return;
    }
    setEditBlogId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setTags('');
    setConclusion('');
    setStatus(defaultStatus);
    setContentTab('write');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // Open Modal in "Edit" mode with prefilled details
  const openEditModal = (blog) => {
    if (!canEdit) {
      showToast('Permission Denied: You do not have permission to edit articles.');
      return;
    }
    setEditBlogId(blog._id);
    setTitle(blog.title || '');
    setContent(blog.content || '');
    setImageUrl(blog.imageUrl || '');
    setTags(Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '');
    setConclusion(blog.conclusion || '');
    setStatus(blog.status || 'Draft');
    setContentTab('write');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // AI Content Generator
  const handleGenerateWithAI = async () => {
    if (!canUseAI) {
      setModalError('Permission Denied: You do not have permission to use AI blog generation.');
      return;
    }

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

  // Save Blog (Draft or Published)
  const handleSaveBlog = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!editBlogId && !canCreate) {
      setModalError('Permission Denied: You do not have permission to create articles.');
      return;
    }

    if (editBlogId && !canEdit) {
      setModalError('Permission Denied: You do not have permission to edit articles.');
      return;
    }

    if (!title.trim() || !content.trim() || !conclusion.trim()) {
      setModalError('Please fill in Title, Content, and Conclusion.');
      return;
    }

    try {
      setSaving(true);
      const blogData = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        tags: tags,
        conclusion: conclusion.trim(),
        status: status
      };

      if (editBlogId) {
        await updateBlog(editBlogId, blogData);
        showToast(`Article "${title}" updated successfully.`);
      } else {
        await createBlog(blogData);
        showToast(
          status === 'Published'
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
    if (!canEdit) {
      showToast('Permission Denied: You do not have permission to edit or publish articles.');
      return;
    }
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
    if (!canEdit) {
      showToast('Permission Denied: You do not have permission to edit articles.');
      return;
    }
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

  // Delete Blog handler
  const confirmDeleteBlog = async () => {
    if (!deleteCandidate) return;
    if (!canDelete) {
      showToast('Permission Denied: You do not have permission to delete articles.');
      return;
    }
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

  // SuperAdmin: Create New Admin handler with granular permissions
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
        role: 'admin',
        permissions: newAdminPermissions
      });
      showToast(`Admin account ${newAdminEmail} created successfully!`);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminPermissions({
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true
      });
      await loadAdmins();
    } catch (err) {
      setAdminModalError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // SuperAdmin: Toggle Account Access Status (Active <-> Revoked)
  const handleToggleAdminStatus = async (targetAdmin) => {
    const isRevoking = targetAdmin.status === 'active';
    const confirmPrompt = isRevoking
      ? `Revoke access for ${targetAdmin.email}? They will not be able to log in or perform any actions.`
      : `Reactivate access for ${targetAdmin.email}?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setUpdatingAdminId(targetAdmin._id);
      const newStatus = isRevoking ? 'revoked' : 'active';
      await toggleAdminStatus(targetAdmin._id, newStatus);
      showToast(`Account for ${targetAdmin.email} has been ${isRevoking ? 'revoked' : 'restored'}.`);
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setUpdatingAdminId(null);
    }
  };

  // SuperAdmin: Toggle Granular Permission for an Administrator
  const handleToggleAdminPermission = async (targetAdmin, permKey) => {
    try {
      setUpdatingAdminId(`${targetAdmin._id}-${permKey}`);
      const updatedPerms = {
        ...(targetAdmin.permissions || {}),
        [permKey]: !targetAdmin.permissions?.[permKey]
      };
      await updateAdminPermissions(targetAdmin._id, updatedPerms);
      showToast(`Updated permissions for ${targetAdmin.email}`);
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setUpdatingAdminId(null);
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
    localStorage.removeItem('adminStatus');
    localStorage.removeItem('adminPermissions');
    navigate('/admin/login');
  };

  // Compute Statistics safely from blogList
  const totalBlogs = blogList.length;
  const publishedCount = blogList.filter((b) => b.status === 'Published').length;
  const draftCount = blogList.filter((b) => b.status === 'Draft').length;

  // Filter blogs according to active tab and search query safely
  const filteredBlogs = blogList.filter((blog) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PUBLISHED'
        ? blog.status === 'Published'
        : activeTab === 'DRAFT'
        ? blog.status === 'Draft'
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-slate-800 dark:text-slate-100">

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Editorial CMS Dashboard
            </h1>

            {/* Current User Role Badge */}
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> SuperAdmin
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <Shield className="w-3 text-blue-600 dark:text-blue-400" /> Admin
                </span>
                <button
                  type="button"
                  onClick={() => setIsMyPermissionsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full transition cursor-pointer"
                  title="View your granted capabilities and permissions"
                >
                  <SlidersHorizontal className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> My Access Powers
                </button>
              </div>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-slate-700 dark:text-slate-200">{currentEmail}</strong>. Manage your publication workflow and author articles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SuperAdmin Only: Go to Dedicated SuperAdmin Panel */}
          {isSuperAdmin && (
            <Link
              to="/superadmin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer"
              title="Open the dedicated SuperAdministrator Command Center"
            >
              <Crown className="w-3.5 h-3.5 text-amber-900" /> SuperAdmin Command Center
            </Link>
          )}

          {/* SuperAdmin Quick Modal: Manage Team Admins */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setIsAdminTeamModalOpen(true);
                loadAdmins();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 px-3.5 py-2 rounded-lg transition shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" /> Manage Admins & Permissions
            </button>
          )}

          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 px-3.5 py-2 rounded-lg transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Public Site
          </Link>

          {/* Self-Service Password Change Button */}
          <button
            type="button"
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordModalError('');
              setCurrentPasswordInput('');
              setNewPasswordInput('');
              setConfirmNewPasswordInput('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-lg transition shadow-2xs cursor-pointer"
            title="Change your login credentials"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Change Password</span>
          </button>

          <Link
            to="/admin/create"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs ${
              canCreate
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 pointer-events-none border border-slate-300 dark:border-slate-700'
            }`}
            title={canCreate ? 'Compose New Article' : 'Permission to create blogs is restricted by SuperAdmin'}
          >
            {canCreate ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            Create Article
          </Link>

          <button
            onClick={handleLogout}
            title="Sign out of admin portal"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        
        {/* Total Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Articles</div>
            {loading ? (
              <div className="h-7 w-14 bg-slate-200/80 animate-pulse rounded-md mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{totalBlogs}</div>
            )}
          </div>
        </div>

        {/* Published Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Published Live</div>
            {loading ? (
              <div className="h-7 w-14 bg-emerald-100/80 animate-pulse rounded-md mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{publishedCount}</div>
            )}
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Drafts
            </div>
            {loading ? (
              <div className="h-7 w-14 bg-amber-100/80 animate-pulse rounded-md mt-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                {draftCount}
              </div>
            )}
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
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              {loading ? (
                <span className="w-4 h-3 bg-slate-200/80 animate-pulse rounded inline-block" />
              ) : (
                <span className="text-slate-500 font-normal">({totalBlogs})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('PUBLISHED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PUBLISHED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Published</span>
              {loading ? (
                <span className="w-4 h-3 bg-slate-200/80 animate-pulse rounded inline-block" />
              ) : (
                <span className="text-slate-500 font-normal">({publishedCount})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('DRAFT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Drafts</span>
              {loading ? (
                <span className="w-4 h-3 bg-slate-200/80 animate-pulse rounded inline-block" />
              ) : (
                <span className="text-slate-500 font-normal">({draftCount})</span>
              )}
            </button>
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
            <span>Loading articles and portal status...</span>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-medium text-slate-700 mb-1">No articles match your criteria</p>
            <p className="text-xs text-slate-400 mb-4">
              Try adjusting your search filter, select a different tab, or create a new blog.
            </p>
            <Link
              to="/admin/create"
              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition"
            >
              + Create Article Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Article Details</th>
                  <th className="py-3.5 px-4">Publication Status</th>
                  <th className="py-3.5 px-4">Date & Timestamp</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedBlogs.map((blog) => {
                  const isPublished = blog.status === 'Published';
                  const isDraft = !isPublished;

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

                      {/* Status Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Dates Column */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                        {isPublished && blog.publishedAt ? (
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
                          
                          {/* Quick Publish Now for Draft posts */}
                          {isDraft && (
                            <button
                              onClick={() => {
                                if (!canEdit) {
                                  showToast('Permission Denied: You do not have permission to edit/publish articles.');
                                  return;
                                }
                                handlePublishNow(blog);
                              }}
                              disabled={!canEdit}
                              title={canEdit ? 'Publish this article live immediately' : 'Edit permission restricted by SuperAdmin'}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition flex items-center gap-1 ${
                                canEdit
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer'
                                  : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              {canEdit ? <Send className="w-3 h-3" /> : <Lock className="w-3 h-3" />} Publish Now
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
                              onClick={() => {
                                if (!canEdit) {
                                  showToast('Permission Denied: You do not have permission to edit articles.');
                                  return;
                                }
                                handleToggleStatus(blog);
                              }}
                              disabled={!canEdit}
                              title={canEdit ? 'Unpublish to Draft' : 'Edit permission restricted by SuperAdmin'}
                              className={`p-1.5 rounded-md transition ${
                                canEdit
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Article */}
                          <Link
                            to={`/admin/edit/${blog._id}`}
                            title={canEdit ? 'Edit article in dedicated editor' : 'Edit permission restricted by SuperAdmin'}
                            className={`p-1.5 rounded-md transition ${
                              canEdit
                                ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                                : 'text-slate-300 pointer-events-none opacity-60'
                            }`}
                          >
                            {canEdit ? <Edit3 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                          </Link>

                          {/* Delete Article */}
                          <button
                            onClick={() => {
                              if (!canDelete) {
                                showToast('Permission Denied: You do not have permission to delete articles.');
                                return;
                              }
                              setDeleteCandidate(blog);
                            }}
                            disabled={!canDelete}
                            title={canDelete ? 'Delete article' : 'Delete permission restricted by SuperAdmin'}
                            className={`p-1.5 rounded-md transition ${
                              canDelete
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                : 'text-slate-300 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {canDelete ? <Trash2 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
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
                  Configure article content, tags, conclusion, and publication status.
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
            {!canUseAI ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    AI Draft Assistant (Restricted)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  You currently do not have authorization to generate blog content using AI. This power can be enabled by the SuperAdministrator.
                </p>
              </div>
            ) : (
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
                    placeholder="e.g., Scaling Microservices with Event-Driven Architecture"
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
            )}

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

              {/* Cover Image Upload (Cloudinary Drag & Drop or Direct Link) */}
              <ImageDropzone
                value={imageUrl}
                onChange={setImageUrl}
                label="Cover Image"
              />

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

              {/* Publication Status Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Publishing & Release Options
                </label>

                {/* Status Radios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
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

                </div>
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
                    status === 'Draft'
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
                    'Update Article'
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

      {/* DELETE BLOG CONFIRMATION MODAL (Feature 12) */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={confirmDeleteBlog}
        title={deleteCandidate?.title || ''}
        itemName="article"
      />

      {/* SUPERADMIN: TEAM MANAGEMENT & AUTHORIZATION MODAL */}
      {isAdminTeamModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl my-8 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Administrator Authorization & Team Control</h3>
                  <p className="text-xs text-slate-500">SuperAdmin authority: Create accounts, revoke access, and customize granular permissions per admin.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create New Admin Form */}
            <form onSubmit={handleCreateAdmin} className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" /> Create Administrator Account
              </div>

              {adminModalError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{adminModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="admin-email@utsanova.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <input
                  type="password"
                  required
                  placeholder="New Admin Password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Initial Permissions Selector */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Initial Powers Granted:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'canCreateBlog', label: 'Create Blogs' },
                    { key: 'canEditBlog', label: 'Edit Blogs' },
                    { key: 'canDeleteBlog', label: 'Delete Blogs' },
                    { key: 'canUseAI', label: 'Use AI (Groq)' }
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition text-xs ${
                        newAdminPermissions[perm.key]
                          ? 'bg-blue-50/70 border-blue-200 text-blue-800 font-medium'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newAdminPermissions[perm.key]}
                        onChange={(e) =>
                          setNewAdminPermissions((prev) => ({
                            ...prev,
                            [perm.key]: e.target.checked
                          }))
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {creatingAdmin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Administrator Account
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Existing Administrators List */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Existing Administrators ({adminList.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">Click permission badges to toggle access in real-time</span>
              </div>

              {adminListLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  Loading admin accounts...
                </div>
              ) : adminList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No administrator accounts found.</div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {adminList.map((adm) => {
                    const isTargetSuper = adm.role === 'superadmin';
                    const isRevoked = adm.status === 'revoked' || adm.isActive === false;

                    return (
                      <div
                        key={adm._id}
                        className={`p-3.5 border rounded-xl transition ${
                          isRevoked
                            ? 'bg-rose-50/40 border-rose-200'
                            : isTargetSuper
                            ? 'bg-amber-50/20 border-amber-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Admin Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">{adm.email}</span>
                              
                              {/* Role Badge */}
                              {isTargetSuper ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                                  <Crown className="w-3 h-3 text-amber-600" /> SuperAdmin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                                  <Shield className="w-3 h-3 text-blue-600" /> Admin
                                </span>
                              )}

                              {/* Status Badge */}
                              {isRevoked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                                  <Ban className="w-3 h-3 text-rose-600" /> Access Revoked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Active Access
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Registered: {new Date(adm.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Top Actions: Revoke / Restore / Delete */}
                          {!isTargetSuper && (
                            <div className="flex items-center gap-1.5 self-start sm:self-center">
                              {/* Revoke / Restore Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleAdminStatus(adm)}
                                disabled={updatingAdminId === adm._id}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                  isRevoked
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                }`}
                                title={isRevoked ? 'Restore access to login and portal' : 'Revoke all access immediately'}
                              >
                                {updatingAdminId === adm._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isRevoked ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Restore Access
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    Revoke Access
                                  </>
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(adm._id, adm.email)}
                                title="Permanently delete admin account"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Granular Permissions Section */}
                        {isTargetSuper ? (
                          <div className="text-[11px] text-amber-700 font-medium bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                            SuperAdmin maintains unrestricted root authority across all articles and AI generation.
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                              Granular Permissions (Click to toggle):
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { key: 'canCreateBlog', label: 'Create Blogs' },
                                { key: 'canEditBlog', label: 'Edit Blogs' },
                                { key: 'canDeleteBlog', label: 'Delete Blogs' },
                                { key: 'canUseAI', label: 'AI Drafting' }
                              ].map((perm) => {
                                const isGranted = adm.permissions?.[perm.key] !== false;
                                const isToggling = updatingAdminId === `${adm._id}-${perm.key}`;

                                return (
                                  <button
                                    key={perm.key}
                                    type="button"
                                    onClick={() => handleToggleAdminPermission(adm, perm.key)}
                                    disabled={isToggling || isRevoked}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                                      isGranted
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                    }`}
                                    title={`Click to ${isGranted ? 'revoke' : 'grant'} ${perm.label} permission`}
                                  >
                                    {isToggling ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : isGranted ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Lock className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>{perm.label}</span>
                                    <span className="text-[9px] uppercase font-bold tracking-tight opacity-75">
                                      ({isGranted ? 'ON' : 'OFF'})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsAdminTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGULAR ADMIN: "MY ACCESS POWERS" MODAL */}
      {isMyPermissionsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Your Account Capabilities</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Assigned by the SuperAdministrator</p>
                </div>
              </div>
              <button
                onClick={() => setIsMyPermissionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {[
                { granted: canCreate, label: 'Create New Articles', desc: 'Author and save new blog posts' },
                { granted: canEdit, label: 'Edit Articles', desc: 'Modify existing published and draft posts' },
                { granted: canDelete, label: 'Delete Articles', desc: 'Permanently remove articles from the portal' },
                { granted: canUseAI, label: 'Use AI Drafting Assistant', desc: 'Generate blog drafts with Groq AI' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    item.granted ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.granted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{item.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          item.granted
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.granted ? 'Granted' : 'Restricted'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 mb-4 leading-relaxed">
              <strong>Need higher access?</strong> Ask your SuperAdministrator to grant the required permissions to your email.
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsMyPermissionsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SELF-SERVICE: CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Change Account Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your administrator security credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordModalError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passwordModalError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}