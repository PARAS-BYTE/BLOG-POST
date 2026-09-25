import React, { useEffect, useState } from 'react';
import { fetchPublishedBlogs } from '../services/api';
import { Link } from 'react-router-dom';
import { Search, Calendar, Tag } from 'lucide-react';

export default function Home() {
    const [blogs, setBlogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [loading, setLoading] = useState(true);

    const loadBlogs = async (search = '', tag = '') => {
        try {
            setLoading(true);
            const data = await fetchPublishedBlogs(search, tag);
            setBlogs(data);
        } catch (err) {
            console.error('Error loading blogs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlogs(searchQuery, selectedTag);
    }, [selectedTag]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadBlogs(searchQuery, selectedTag);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Utsanova Insights & Blogs</h1>
                <p className="text-gray-600">Discover articles on technology, development, and innovation.</p>
            </header>

            {/* Search & Filter Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 mb-8 justify-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by title, keyword, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    Search
                </button>
                {selectedTag && (
                    <button
                        type="button"
                        onClick={() => { setSelectedTag(''); loadBlogs(searchQuery, ''); }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm"
                    >
                        Clear Tag: #{selectedTag}
                    </button>
                )}
            </form>

            {/* Blog Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading blogs...</div>
            ) : blogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No blogs found matching your criteria.</div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {blogs.map((blog) => (
                        <div key={blog._id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{blog.title}</h2>
                                <p className="text-gray-600 mb-4 line-clamp-3">{blog.content}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {blog.tags.map((t, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedTag(t)}
                                            className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 transition flex items-center gap-1"
                                        >
                                            <Tag className="w-3 h-3" /> {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t pt-4 mt-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> {new Date(blog.createdAt).toLocaleDateString()}
                                </span>
                                <Link
                                    to={`/blog/${blog._id}`}
                                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    Read More
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}