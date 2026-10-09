import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchAdmins,
  adminRegister,
  deleteAdminAccount,
  updateAdminPermissions,
  toggleAdminStatus,
  updateAdminPassword,
  fetchAdminBlogs,
  updateBlog,
  deleteBlog,
  fetchCurrentUser
} from '../services/api';
import {
  Crown,
  Shield,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
  Plus,
  LogOut,
  Calendar,
  Activity,
  Zap,
  BookOpen,
  CheckCircle,
  FileText,
  Layers,
  Settings,
  Edit3,
  Key,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * SuperAdministrator Command Center
 * A dedicated administrative operations panel designed exclusively for SuperAdministrators.
 * Built with seamless Light & Dark theme support:
 * 1. Admin Personnel & Granular Authorization (RBAC)
 * 2. Admin Password Reset / Override by SuperAdmin
 * 3. Platform-wide Editorial Oversight (Master Article Control)
 * 4. Session Audit Trail
 */
export default function SuperAdminPanel() {
  const navigate = useNavigate();

  // Current session
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('personnel'); // 'personnel' | 'editorial'

  // Global metrics
  const [metrics, setMetrics] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    revokedAdmins: 0,
    totalBlogs: 0,
    publishedBlogs: 0,
    draftBlogs: 0
  });

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info'); // 'info' | 'success' | 'error'

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // ==========================================
  // TAB 1: PERSONNEL & AUTHORIZATION STATE
  // ==========================================
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState({
    canCreateBlog: true,
    canEditBlog: true,
    canDeleteBlog: true,
    canUseAI: true
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminFormError, setAdminFormError] = useState('');
  const [updatingAdminId, setUpdatingAdminId] = useState(null);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState(null);

  // SuperAdmin Password Change State for Admins
  const [passwordModalAdmin, setPasswordModalAdmin] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');

  // ==========================================
  // TAB 2: EDITORIAL OVERSIGHT STATE
  // ==========================================
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [blogSearch, setBlogSearch] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState('ALL');
  const [deleteBlogTarget, setDeleteBlogTarget] = useState(null);
  const [actionInProgressBlogId, setActionInProgressBlogId] = useState(null);

  // ==========================================
  // AUDIT LOG (SESSION ACTIVITY)
  // ==========================================
  const [activityLogs, setActivityLogs] = useState([]);

  const addAuditLog = (action, details) => {
    const logItem = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      action,
      details
    };
    setActivityLogs((prev) => [logItem, ...prev.slice(0, 49)]);
  };

  // ------------------------------------------
  // INITIAL DATA LOADING
  // ------------------------------------------
  const loadInitialData = async () => {
    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      if (user.role !== 'superadmin') {
        navigate('/admin/dashboard');
        return;
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
    }

    await Promise.all([
      loadAdminsData(),
      loadBlogsData()
    ]);
  };

  const loadAdminsData = async () => {
    try {
      setAdminsLoading(true);
      const data = await fetchAdmins();
      const list = Array.isArray(data) ? data : [];
      setAdmins(list);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setAdminsLoading(false);
    }
  };

  const loadBlogsData = async () => {
    try {
      setBlogsLoading(true);
      const data = await fetchAdminBlogs();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.blogs) ? data.blogs : []);
      setBlogs(list);
    } catch (err) {
      console.error('Failed to load blogs:', err);
    } finally {
      setBlogsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Compute metrics dynamically
  useEffect(() => {
    const totalAdmins = admins.length;
    const activeAdmins = admins.filter((a) => (a.status || (a.isActive ? 'active' : 'revoked')) === 'active').length;
    const revokedAdmins = admins.filter((a) => (a.status || (a.isActive ? 'active' : 'revoked')) === 'revoked').length;

    const totalBlogs = blogs.length;
    const publishedBlogs = blogs.filter((b) => b.status === 'Published').length;
    const draftBlogs = blogs.filter((b) => b.status === 'Draft').length;

    setMetrics({
      totalAdmins,
      activeAdmins,
      revokedAdmins,
      totalBlogs,
      publishedBlogs,
      draftBlogs
    });
  }, [admins, blogs]);

  // ------------------------------------------
  // TAB 1 ACTIONS: ADMIN MANAGEMENT
  // ------------------------------------------
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminFormError('');

    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      setAdminFormError('Please provide both email and password.');
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
      showToast(`Admin account ${newAdminEmail} created with custom permissions!`, 'success');
      addAuditLog('Created Admin', `Created ${newAdminEmail.trim()} with RBAC permissions`);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setIsAddAdminOpen(false);
      setNewAdminPermissions({
        canCreateBlog: true,
        canEditBlog: true,
        canDeleteBlog: true,
        canUseAI: true
      });
      await loadAdminsData();
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Failed to create administrator account.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (admin) => {
    if (admin.role === 'superadmin') {
      showToast('SuperAdministrator account status cannot be altered.', 'error');
      return;
    }

    const currentStatus = admin.status || (admin.isActive ? 'active' : 'revoked');
    const newStatus = currentStatus === 'active' ? 'revoked' : 'active';
    const actionLabel = newStatus === 'revoked' ? 'Revoking Access' : 'Restoring Access';

    try {
      setUpdatingAdminId(admin._id);
      await toggleAdminStatus(admin._id, newStatus);
      showToast(
        newStatus === 'revoked'
          ? `Access Revoked: ${admin.email} is immediately suspended.`
          : `Access Restored: ${admin.email} is now active.`,
        'success'
      );
      addAuditLog(actionLabel, `Changed status of ${admin.email} to ${newStatus}`);
      await loadAdminsData();
    } catch (err) {
      console.error('Failed to update admin status:', err);
      showToast(err.response?.data?.message || 'Failed to change admin status.', 'error');
    } finally {
      setUpdatingAdminId(null);
    }
  };

  const handleToggleSinglePermission = async (admin, permKey) => {
    if (admin.role === 'superadmin') {
      showToast('SuperAdministrator inherently possesses full privileges.', 'info');
      return;
    }

    const currentPerms = admin.permissions || {
      canCreateBlog: true,
      canEditBlog: true,
      canDeleteBlog: true,
      canUseAI: true
    };

    const newPerms = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    try {
      setUpdatingAdminId(admin._id);
      await updateAdminPermissions(admin._id, newPerms);
      showToast(`Updated "${permKey}" permission for ${admin.email}.`, 'success');
      addAuditLog('Permission Changed', `Toggled ${permKey} to ${newPerms[permKey]} for ${admin.email}`);
      await loadAdminsData();
    } catch (err) {
      console.error('Failed to update permission:', err);
      showToast(err.response?.data?.message || 'Failed to update permissions.', 'error');
    } finally {
      setUpdatingAdminId(null);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deleteAdminTarget) return;

    if (deleteAdminTarget.role === 'superadmin') {
      showToast('SuperAdministrator accounts cannot be deleted.', 'error');
      setDeleteAdminTarget(null);
      return;
    }

    try {
      await deleteAdminAccount(deleteAdminTarget._id);
      showToast(`Admin account ${deleteAdminTarget.email} permanently removed.`, 'success');
      addAuditLog('Deleted Admin', `Permanently deleted account ${deleteAdminTarget.email}`);
      setDeleteAdminTarget(null);
      await loadAdminsData();
    } catch (err) {
      console.error('Failed to delete admin:', err);
      showToast(err.response?.data?.message || 'Failed to delete admin account.', 'error');
    }
  };

  // ------------------------------------------
  // SUPERADMIN PASSWORD OVERRIDE ACTIONS
  // ------------------------------------------
  const handleOpenPasswordModal = (admin) => {
    setPasswordModalAdmin(admin);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setPasswordModalError('');
    setShowPasswordText(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordVal(generated);
    setConfirmPasswordVal(generated);
    setShowPasswordText(true);
  };

  const handleSubmitChangePassword = async (e) => {
    e.preventDefault();
    setPasswordModalError('');

    if (!newPasswordVal || newPasswordVal.length < 6) {
      setPasswordModalError('New password must be at least 6 characters long.');
      return;
    }

    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordModalError('Passwords do not match. Please verify confirmation.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await updateAdminPassword(passwordModalAdmin._id, newPasswordVal);
      showToast(`Password successfully reset for administrator: ${passwordModalAdmin.email}`, 'success');
      addAuditLog('Changed Admin Password', `Reset password credentials for ${passwordModalAdmin.email}`);
      setPasswordModalAdmin(null);
      setNewPasswordVal('');
      setConfirmPasswordVal('');
    } catch (err) {
      console.error('Failed to update admin password:', err);
      setPasswordModalError(err.response?.data?.message || 'Failed to change admin password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ------------------------------------------
  // TAB 2 ACTIONS: EDITORIAL OVERSIGHT
  // ------------------------------------------
  const handleForcePublishBlog = async (blog) => {
    try {
      setActionInProgressBlogId(blog._id);
      await updateBlog(blog._id, { status: 'Published' });
      showToast(`"${blog.title}" published live immediately!`, 'success');
      addAuditLog('Published Article', `Published "${blog.title}" live`);
      await loadBlogsData();
    } catch (err) {
      console.error('Failed to force publish blog:', err);
      showToast(err.response?.data?.message || 'Could not publish article.', 'error');
    } finally {
      setActionInProgressBlogId(null);
    }
  };

  const handleRevertToDraft = async (blog) => {
    try {
      setActionInProgressBlogId(blog._id);
      await updateBlog(blog._id, { status: 'Draft' });
      showToast(`"${blog.title}" reverted to Draft.`, 'info');
      addAuditLog('Reverted to Draft', `Unpublished "${blog.title}"`);
      await loadBlogsData();
    } catch (err) {
      console.error('Failed to revert blog:', err);
      showToast(err.response?.data?.message || 'Could not revert article.', 'error');
    } finally {
      setActionInProgressBlogId(null);
    }
  };

  const handleConfirmDeleteBlog = async () => {
    if (!deleteBlogTarget) return;
    try {
      await deleteBlog(deleteBlogTarget._id);
      showToast(`Article "${deleteBlogTarget.title}" permanently purged.`, 'success');
      addAuditLog('Purged Article', `Deleted "${deleteBlogTarget.title}" (ID: ${deleteBlogTarget._id})`);
      setDeleteBlogTarget(null);
      await loadBlogsData();
    } catch (err) {
      console.error('Failed to delete blog:', err);
      showToast(err.response?.data?.message || 'Could not delete article.', 'error');
    }
  };

  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminStatus');
    localStorage.removeItem('adminPermissions');
    navigate('/admin/login');
  };

  // Filtered lists
  const filteredAdmins = admins.filter((admin) => {
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase();
    return (
      admin.email?.toLowerCase().includes(q) ||
      admin.role?.toLowerCase().includes(q) ||
      (admin.status || '').toLowerCase().includes(q)
    );
  });

  const filteredBlogs = blogs.filter((blog) => {
    if (blogStatusFilter !== 'ALL' && blog.status !== blogStatusFilter) {
      return false;
    }
    if (!blogSearch.trim()) return true;
    const q = blogSearch.toLowerCase();
    return (
      blog.title?.toLowerCase().includes(q) ||
      blog.tags?.some((t) => t.toLowerCase().includes(q)) ||
      blog.author?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-16">
      
      {/* ====================================================
          SUPERADMIN TOP MASTER BANNER & CONTROLS
          ==================================================== */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Identity & Crown Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-900 font-black shadow-sm">
              <Crown className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  SuperAdministrator Command Center
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Master Clearance
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as <strong className="text-slate-800 dark:text-slate-200">{currentUser?.email || 'superadmin@utsanova.com'}</strong> • Role-Based Access Control & Operations
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition shadow-2xs"
              title="Switch to Standard Editorial Dashboard to write articles"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Editorial Workspace</span>
            </Link>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition shadow-2xs"
              title="View Public Blog Website"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline">View Public Blog</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition shadow-2xs cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </section>

      {/* ====================================================
          GLOBAL EXECUTIVE KPI TILES
          ==================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2 w-full">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {toastType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toastType === 'info' ? (
              <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage('')}
              className="text-slate-400 hover:text-white ml-2 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* High-Level Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          
          {/* Card 1: Admins */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Administrators</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            {adminsLoading ? (
              <div className="h-8 w-16 bg-slate-200/80 dark:bg-slate-800 animate-pulse rounded-md my-0.5" />
            ) : (
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metrics.totalAdmins}</div>
            )}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {adminsLoading ? (
                <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
              ) : (
                <>
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {metrics.activeAdmins} Active
                  </span>
                  {metrics.revokedAdmins > 0 && (
                    <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {metrics.revokedAdmins} Revoked
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 2: Live Articles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Live Articles</span>
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            {blogsLoading ? (
              <div className="h-8 w-16 bg-emerald-100/80 dark:bg-emerald-950/40 animate-pulse rounded-md my-0.5" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.publishedBlogs}</div>
            )}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {blogsLoading ? (
                <div className="h-4 w-36 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
              ) : (
                <>
                  Total platform content: <strong className="text-slate-700 dark:text-slate-300">{metrics.totalBlogs}</strong>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Draft Articles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Draft Articles</span>
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            {blogsLoading ? (
              <div className="h-8 w-16 bg-amber-100/80 dark:bg-amber-950/40 animate-pulse rounded-md my-0.5" />
            ) : (
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.draftBlogs}</div>
            )}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Private editorial drafts in progress
            </div>
          </div>

          {/* Card 4: Platform Engine & Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Engine Status</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Ultra-Fast & Responsive
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Stack: <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Clean Lightweight API</span>
            </div>
          </div>

        </div>

        {/* ====================================================
            WORKSPACE TABS NAVIGATION
            ==================================================== */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-6">
          <div className="flex items-center gap-1 sm:gap-2">
            
            <button
              onClick={() => setActiveTab('personnel')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'personnel'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Admin Personnel & Access</span>
              {adminsLoading ? (
                <span className="ml-1 w-4 h-3 bg-white/30 animate-pulse rounded-full inline-block" />
              ) : (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {admins.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('editorial')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'editorial'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Editorial Master Control</span>
              {blogsLoading ? (
                <span className="ml-1 w-4 h-3 bg-white/30 animate-pulse rounded-full inline-block" />
              ) : (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {blogs.length}
                </span>
              )}
            </button>

          </div>

          {/* Quick Refresh Data button */}
          <button
            onClick={loadInitialData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer"
            title="Refresh All Operations Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

      </div>

      {/* ====================================================
          TAB 1: ADMIN PERSONNEL & AUTHORIZATION ENGINE
          ==================================================== */}
      {activeTab === 'personnel' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-6">
          
          {/* Section Sub-Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Administrator Personnel & RBAC Authorization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Grant or revoke granular system permissions (Create, Edit, Delete, AI Groq) and manage access states.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Admins */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by email or role..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition w-48 sm:w-56"
                />
              </div>

              {/* Add New Admin Button */}
              <button
                onClick={() => setIsAddAdminOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Admin</span>
              </button>
            </div>
          </div>

          {/* New Admin Creation Form */}
          {isAddAdminOpen && (
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-5 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create New Administrator Account</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure custom initial permissions upon account provision.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddAdminOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {adminFormError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{adminFormError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAdminSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Administrator Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="writer@utsanova.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Secure Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                    />
                  </div>
                </div>

                {/* Granular Initial Permissions */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Initial Granular Privileges
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'canCreateBlog', label: 'Create Articles', desc: 'Author drafts & posts' },
                      { key: 'canEditBlog', label: 'Edit Articles', desc: 'Modify published content' },
                      { key: 'canDeleteBlog', label: 'Delete Articles', desc: 'Purge articles' },
                      { key: 'canUseAI', label: 'Groq AI Assistant', desc: 'AI article drafting' }
                    ].map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex flex-col p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                          newAdminPermissions[perm.key]
                            ? 'bg-blue-50/70 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{perm.label}</span>
                          <input
                            type="checkbox"
                            checked={newAdminPermissions[perm.key]}
                            onChange={(e) =>
                              setNewAdminPermissions((prev) => ({
                                ...prev,
                                [perm.key]: e.target.checked
                              }))
                            }
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{perm.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {creatingAdmin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      'Save & Provision Admin'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin Directory Table / Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Registered Administrative Accounts ({filteredAdmins.length})
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any permission tag below to toggle access immediately
              </span>
            </div>

            {adminsLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                Loading administrator accounts...
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No administrators found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAdmins.map((admin) => {
                  const isCurrentSuper = admin.role === 'superadmin';
                  const adminStatus = admin.status || (admin.isActive ? 'active' : 'revoked');
                  const isRevoked = adminStatus === 'revoked';
                  const isUpdating = updatingAdminId === admin._id;
                  const perms = admin.permissions || {
                    canCreateBlog: true,
                    canEditBlog: true,
                    canDeleteBlog: true,
                    canUseAI: true
                  };

                  return (
                    <div
                      key={admin._id}
                      className={`p-4 sm:p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isRevoked ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Identity & Status */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isCurrentSuper
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : isRevoked
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                          }`}
                        >
                          {isCurrentSuper ? (
                            <Crown className="w-4 h-4" />
                          ) : isRevoked ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{admin.email}</span>
                            {isCurrentSuper ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300">
                                SuperAdministrator
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                Administrator
                              </span>
                            )}

                            {/* Status Badge */}
                            {isRevoked ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-500" /> Revoked (Suspended)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" /> Active
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                            <span>ID: <code className="text-slate-600 font-mono text-[10px]">{admin._id}</code></span>
                            {admin.createdAt && (
                              <span>Created: {new Date(admin.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Granular Permission Interactive Pills */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { key: 'canCreateBlog', label: 'Create' },
                            { key: 'canEditBlog', label: 'Edit' },
                            { key: 'canDeleteBlog', label: 'Delete' },
                            { key: 'canUseAI', label: 'AI Groq' }
                          ].map(({ key, label }) => {
                            const isAllowed = isCurrentSuper || perms[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={isCurrentSuper || isUpdating || isRevoked}
                                onClick={() => handleToggleSinglePermission(admin, key)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition ${
                                  isCurrentSuper
                                    ? 'bg-amber-50 text-amber-800 border border-amber-300 cursor-default'
                                    : isAllowed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600 line-through cursor-pointer'
                                } ${isRevoked ? 'opacity-40 cursor-not-allowed' : ''}`}
                                title={
                                  isCurrentSuper
                                    ? 'SuperAdmin always has this permission'
                                    : isRevoked
                                    ? 'Account is revoked - restore access first'
                                    : `Click to ${isAllowed ? 'Revoke' : 'Grant'} ${label}`
                                }
                              >
                                {isAllowed ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <X className="w-3 h-3 text-slate-400" />
                                )}
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Buttons (Change Password, Revoke/Restore, Delete) */}
                        {!isCurrentSuper && (
                          <div className="flex items-center gap-2 mt-2 sm:mt-0 pl-2 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 flex-wrap">
                            {/* Change Password Button (SuperAdmin feature) */}
                            <button
                              type="button"
                              onClick={() => handleOpenPasswordModal(admin)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title={`Reset password for ${admin.email}`}
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Password</span>
                            </button>

                            {/* Revoke / Restore Button */}
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleAdminStatus(admin)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                isRevoked
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              }`}
                              title={isRevoked ? 'Restore admin access' : 'Immediately revoke all access'}
                            >
                              {isRevoked ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" /> Restore
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Revoke
                                </>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteAdminTarget(admin)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Permanently Delete Admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ====================================================
          TAB 2: EDITORIAL MASTER CONTROL
          ==================================================== */}
      {activeTab === 'editorial' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Platform Content & Article Oversight
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Master oversight across all articles. SuperAdministrator can instantly publish, unpublish, or delete any post.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search articles by title, tag, author..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition w-56 sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={blogStatusFilter}
                onChange={(e) => setBlogStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="ALL">All Statuses {blogsLoading ? '' : `(${blogs.length})`}</option>
                <option value="Published">Published {blogsLoading ? '' : `(${metrics.publishedBlogs})`}</option>
                <option value="Draft">Draft {blogsLoading ? '' : `(${metrics.draftBlogs})`}</option>
              </select>

              {/* Author New Article */}
              <Link
                to="/admin/create"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
                title="Launch article authoring with Cloudinary image uploader"
              >
                <Plus className="w-4 h-4" />
                <span>Create Article</span>
              </Link>
            </div>
          </div>

          {/* Master Articles Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Article</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Author</th>
                    <th className="px-4 py-3.5">Date / Timing</th>
                    <th className="px-5 py-3.5 text-right">SuperAdmin Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blogsLoading ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                        Loading articles...
                      </td>
                    </tr>
                  ) : filteredBlogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No articles found for this filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredBlogs.map((blog) => {
                      const isActioning = actionInProgressBlogId === blog._id;

                      return (
                        <tr key={blog._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          {/* Title & Tags */}
                          <td className="px-5 py-4 max-w-xs sm:max-w-md">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-1">
                              {blog.title}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {blog.tags?.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {blog.tags?.length > 3 && (
                                <span className="text-[10px] text-slate-400">
                                  +{blog.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {blog.status === 'Published' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Published
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 w-fit">
                                Draft
                              </span>
                            )}
                          </td>

                          {/* Author */}
                          <td className="px-4 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{blog.author?.email || 'Administrator'}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{blog.author?.role || 'admin'}</div>
                          </td>

                          {/* Timing */}
                          <td className="px-4 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                            {blog.status === 'Published' && blog.publishedAt ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                Published: {new Date(blog.publishedAt).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="text-slate-500 dark:text-slate-400">
                                Modified: {new Date(blog.updatedAt || blog.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          {/* SuperAdmin Master Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              
                              {/* If not published, SuperAdmin can Force Publish immediately */}
                              {blog.status !== 'Published' && (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleForcePublishBlog(blog)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Force publish live now"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Publish Now</span>
                                </button>
                              )}

                              {/* If Published, SuperAdmin can Revert to Draft */}
                              {blog.status === 'Published' && (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleRevertToDraft(blog)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                  title="Unpublish article back to Draft"
                                >
                                  Revert to Draft
                                </button>
                              )}

                              {/* Public link if published */}
                              {blog.status === 'Published' && (
                                <Link
                                  to={`/blog/${blog._id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition"
                                  title="View Public Post"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Edit Article in Full Editor */}
                              <Link
                                to={`/admin/edit/${blog._id}`}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition"
                                title="Edit in Full Article Editor"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>

                              {/* Delete Article */}
                              <button
                                type="button"
                                onClick={() => setDeleteBlogTarget(blog)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Purge Article"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ====================================================
          SESSION AUDIT TRAIL
          ==================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Activity & Audit Log
            </h3>
          </div>

          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              SuperAdministrative actions executed during this active session will be logged here.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}: </span>
                    <span className="text-slate-600 dark:text-slate-300">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-3">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          MODAL: SUPERADMIN RESET ADMIN PASSWORD
          ==================================================== */}
      {passwordModalAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Reset Administrator Password
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                    Target: <strong className="text-slate-700 dark:text-slate-200">{passwordModalAdmin.email}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalAdmin(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {passwordModalError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passwordModalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitChangePassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" /> Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[11px] text-slate-500 dark:text-slate-400">
                <p>
                  As <strong>SuperAdministrator</strong>, updating this password immediately overrides the existing admin credentials with full bcrypt security hashing.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalAdmin(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Override Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          CONFIRMATION MODAL: DELETE ADMIN
          ==================================================== */}
      {deleteAdminTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Permanently Delete Admin?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete administrator account{' '}
              <strong className="text-slate-900 dark:text-slate-200">{deleteAdminTarget.email}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteAdminTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAdmin}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          CONFIRMATION MODAL: PURGE ARTICLE
          ==================================================== */}
      {deleteBlogTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Purge Article Permanently?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 dark:text-slate-200">"{deleteBlogTarget.title}"</strong>? It will be removed from all public listings.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteBlogTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBlog}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Purge Article
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
