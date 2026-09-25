import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBlogById } from '../services/api';
import { ArrowLeft, Calendar, Tag, CheckCircle } from 'lucide-react';

export default function BlogDetail() {
    const { id } = useParams();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBlog = async () => {
            try {
                const data = await fetchBlogById(id);
                setBlog(data);
            } catch (err) {
                console.error('Error loading blog detail:', err);
            } finally {
                setLoading(false);
            }
        };
        loadBlog();
    }, [id]);

    if (loading) return <div className="text-center py-20 text-gray-500">Loading article...</div>;
    if (!blog) return <div className="text-center py-20 text-red-500">Blog not found.</div>;

    return (
        <article className="max-w-3xl mx-auto px-4 py-10">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Blogs
            </Link>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{blog.title}</h1>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b">
                <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {new Date(blog.createdAt).toLocaleDateString()}
                </span>
            </div>

            <div className="prose max-w-none text-gray-800 leading-relaxed mb-8 whitespace-pre-wrap">
                {blog.content}
            </div>

            {blog.conclusion && (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg mb-8">
                    <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" /> Conclusion
                    </h3>
                    <p className="text-blue-800 text-sm">{blog.conclusion}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t">
                {blog.tags.map((t, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {t}
                    </span>
                ))}
            </div>
        </article>
    );
}