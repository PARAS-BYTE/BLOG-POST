import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminBlogs, createBlog, updateBlog, deleteBlog } from '../services/api';
import { LogOut, Plus, Edit, Trash2, BookOpen, CheckCircle, FileText, X } from 'lucide-react';

export default function AdminDashboard() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editBlogId, setEditBlogId] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [conclusion, setConclusion] = useState('');
    const [status, setStatus] = useState('Draft');

    const navigate = useNavigate();

    const loadBlogs = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminBlogs();
            setBlogs(data);
        } catch (err) {
            console.error('Error fetching admin blogs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlogs();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    const openCreateModal = () => {
        setEditBlogId(null);
        setTitle('');
        setContent('');
        setTags('');
        setConclusion('');
        setStatus('Draft');
        setIsModalOpen(true);
    };

    const openEditModal = (blog) => {
        setEditBlogId(blog._id);
        setTitle(blog.title);
        setContent(blog.content);
        setTags(blog.tags.join(', '));
        setConclusion(blog.conclusion);
        setStatus(blog.status);
        setIsModalOpen(true);
    };

    const handleSaveBlog = async (e) => {
        e.preventDefault();
        try {
            const blogData = { title, content, tags, conclusion, status };
            if (editBlogId) {
                await updateBlog(editBlogId, blogData);
            } else {
                await createBlog(blogData);
            }
            setIsModalOpen(false);
            loadBlogs();
        } catch (err) {
            console.error('Error saving blog:', err);
            alert('Failed to save blog');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this blog?')) {
            try {
                await deleteBlog(id);
                loadBlogs();
            } catch (err) {
                console.error('Error deleting blog:', err);
            }
        }
    };

    // Stats calculations
    const totalBlogs = blogs.length;
    const publishedCount = blogs.filter(b => b.status === 'Published').length;
    const draftCount = blogs.filter(b => b.status === 'Draft').length;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Navbar */}
            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-bold text-gray-900">Utsanova Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <a href="/" target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                        View Live Site
                    </a>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><BookOpen className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Total Blogs</p>
                            <h3 className="text-2xl font-bold text-gray-900">{totalBlogs}</h3>
                        </div>
                    </div>
                    <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Published Blogs</p>
                            <h3 className="text-2xl font-bold text-gray-900">{publishedCount}</h3>
                        </div>
                    </div>
                    <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Draft Blogs</p>
                            <h3 className="text-2xl font-bold text-gray-900">{draftCount}</h3>
                        </div>
                    </div>
                </div>

                {/* Header & Create Button */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Manage Blog Posts</h2>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" /> Create New Blog
                    </button>
                </div>

                {/* Blog Table */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
                ) : blogs.length === 0 ? (
                    <div className="text-center py-12 bg-white border rounded-xl text-gray-500">No blogs found. Create your first one!</div>
                ) : (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {blogs.map((blog) => (
                                    <tr key={blog._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">{blog.title}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${blog.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {blog.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(blog.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEditModal(blog)} className="text-blue-600 hover:text-blue-800 p-1">
                                                <Edit className="w-4 h-4 inline" />
                                            </button>
                                            <button onClick={() => handleDelete(blog._id)} className="text-red-600 hover:text-red-800 p-1">
                                                <Trash2 className="w-4 h-4 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal for Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <h3 className="text-lg font-bold text-gray-900">{editBlogId ? 'Edit Blog' : 'Create New Blog'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBlog} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Main Content</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="MERN, React, JavaScript"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Conclusion</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={conclusion}
                                    onChange={(e) => setConclusion(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Published">Published</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    {editBlogId ? 'Update Blog' : 'Publish Blog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}