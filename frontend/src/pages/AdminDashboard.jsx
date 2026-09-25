import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAdminBlogs, createBlog, updateBlog, deleteBlog, generateAIBlog } from '../services/api';
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
  Image as ImageIcon
} from 'lucide-react';

/**
 * AdminDashboard Page
 * Central management portal for administrators to view analytics, create, edit,
 * and publish/unpublish blogs. Features Groq-powered AI drafting with dummy image support.
 */
export default function AdminDashboard() {
  const navigate = useNavigate();

  // Blog list & loading states
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT'
  const [filterSearch, setFilterSearch] = useState('');

  // Modal State for Creating/Editing
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
  const [status, setStatus] = useState('Draft');

  // AI Assistant State (Powered by Groq)
  const [aiTopic, setAiTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Deletion confirmation state
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Fetch all blogs (both Drafts and Published)
  const loadBlogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminBlogs();
      setBlogs(data);
    } catch (err) {
      console.error('Error fetching admin blogs:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Open the Modal in "Create" mode
  const openCreateModal = () => {
    setEditBlogId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setTags('');
    setConclusion('');
    setStatus('Published');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // Open the Modal in "Edit" mode with pre-filled blog details
  const openEditModal = (blog) => {
    setEditBlogId(blog._id);
    setTitle(blog.title);
    setContent(blog.content);
    setImageUrl(blog.imageUrl || '');
    setTags(Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '');
    setConclusion(blog.conclusion || '');
    setStatus(blog.status || 'Draft');
    setModalError('');
    setAiTopic('');
    setAiSuccessMessage('');
    setIsModalOpen(true);
  };

  // Generate Blog Draft using Groq LLM (includes a dummy image by default)
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

      // Pre-fill the form with AI generated draft values & dummy image
      if (result.title) setTitle(result.title);
      if (result.content) setContent(result.content);
      if (result.imageUrl) setImageUrl(result.imageUrl);
      if (result.tags) {
        setTags(Array.isArray(result.tags) ? result.tags.join(', ') : result.tags);
      }
      if (result.conclusion) setConclusion(result.conclusion);

      setAiSuccessMessage('AI Draft generated with dummy cover image! Review and adjust any values before saving.');
    } catch (err) {
      console.error('Failed to generate with AI:', err);
      setModalError(
        err.response?.data?.message || 'Failed to generate blog draft with AI. Please try again.'
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Save Blog (Handles both Create and Update)
  const handleSaveBlog = async (e) => {
    e.preventDefault();
    setModalError('');

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
      } else {
        await createBlog(blogData);
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

  // Quick toggle publication status (Publish / Unpublish)
  const handleToggleStatus = async (blog) => {
    try {
      const newStatus = blog.status === 'Published' ? 'Draft' : 'Published';
      await updateBlog(blog._id, { status: newStatus });
      await loadBlogs();
    } catch (err) {
      console.error('Failed to change status:', err);
      alert('Could not update status.');
    }
  };

  // Delete Blog handler
  const confirmDeleteBlog = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteBlog(deleteCandidate._id);
      setDeleteCandidate(null);
      await loadBlogs();
    } catch (err) {
      console.error('Failed to delete blog:', err);
      alert('Could not delete blog.');
    }
  };

  // Compute Dashboard Statistics
  const totalBlogs = blogs.length;
  const publishedCount = blogs.filter((b) => b.status === 'Published').length;
  const draftCount = blogs.filter((b) => b.status === 'Draft').length;

  // Filter blogs according to active tab and search query
  const filteredBlogs = blogs.filter((blog) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PUBLISHED'
        ? blog.status === 'Published'
        : blog.status === 'Draft';

    const matchesSearch =
      filterSearch.trim() === ''
        ? true
        : blog.title.toLowerCase().includes(filterSearch.toLowerCase()) ||
          (blog.tags && blog.tags.some((t) => t.toLowerCase().includes(filterSearch.toLowerCase())));

    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your articles, review analytics, and publish updates to the public site.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-lg transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Live Site
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Article
          </button>
        </div>
      </div>

      {/* Analytics / Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        
        {/* Total Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Articles</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalBlogs}</div>
          </div>
        </div>

        {/* Published Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{publishedCount}</div>
          </div>
        </div>

        {/* Draft Blogs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{draftCount}</div>
          </div>
        </div>

      </div>

      {/* Articles Management Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Filters & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-1 sm:flex-none cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalBlogs})
            </button>
            <button
              onClick={() => setActiveTab('PUBLISHED')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-1 sm:flex-none cursor-pointer ${
                activeTab === 'PUBLISHED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setActiveTab('DRAFT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-1 sm:flex-none cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCount})
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
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            Loading articles list...
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-medium text-slate-700 mb-1">No articles match your criteria</p>
            <p className="text-xs text-slate-400 mb-4">
              Try adjusting your search filter or create a new blog.
            </p>
            <button
              onClick={openCreateModal}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition"
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
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredBlogs.map((blog) => (
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

                    {/* Status Badge & Toggle */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(blog)}
                        title="Click to toggle Draft / Published"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition ${
                          blog.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            blog.status === 'Published' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        ></span>
                        {blog.status}
                      </button>
                    </td>

                    {/* Creation Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(blog.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/blog/${blog._id}`}
                          target="_blank"
                          title="View public page"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(blog)}
                          title="Edit article"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* CREATE / EDIT MODAL */}
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
                  Fill in the fields below or generate a draft with AI before saving.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI BLOG DRAFT ASSISTANT BOX (Powered by Groq with dummy image) */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 rounded-xl p-4 mb-5 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Generate Draft with AI (Powered by Groq)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                Provide a topic or brief summary. The AI will populate Title, Content, Cover Image (dummy), Tags, and Conclusion for you to review and edit before saving.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g., Best Practices for Next.js App Router and Server Components"
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

              {/* AI Success Feedback */}
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
                  <span className="text-[11px] text-slate-400">Direct link (e.g. Unsplash)</span>
                </div>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-1518770660439-4636190af475..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
                {imageUrl && (
                  <div className="mt-2 relative h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
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

              {/* Main Content Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Main Content / Body *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write or edit the full content of the article here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed font-sans"
                />
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
                  rows={3}
                  placeholder="Summarize the core insights of this article..."
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                >
                  <option value="Published">Published (Visible to all public readers)</option>
                  <option value="Draft">Draft (Saved in admin dashboard only)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : editBlogId ? (
                    'Update Article'
                  ) : (
                    'Save & Publish'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl">
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
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBlog}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}