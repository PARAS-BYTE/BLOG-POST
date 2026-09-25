import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBlogById } from '../services/api';
import {
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Share2,
  Check,
  ImageIcon
} from 'lucide-react';

/**
 * BlogDetail Page
 * Displays full blog post with high-resolution cover image banner,
 * rich content formatting, conclusion takeaways, and clickable discovery tags.
 */
export default function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBlogById(id);
        setBlog(data);
      } catch (err) {
        console.error('Error fetching blog detail:', err);
        setError('This article could not be found or has not been published yet.');
      } finally {
        setLoading(false);
      }
    };
    loadBlog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Loading article details...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Article Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{error || 'Article does not exist.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Articles
          </Link>
        </div>
      </div>
    );
  }

  const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 150));

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      
      {/* Top Navigation & Share Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all articles
        </Link>

        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Copied Link!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          {blog.title}
        </h1>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 py-3 border-y border-slate-100">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            UTSAN<span className="text-blue-600">OVA</span> Engineering
          </div>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(blog.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {readTime} min read
          </span>
        </div>
      </header>

      {/* Featured Cover Image */}
      {blog.imageUrl && (
        <div className="mb-10 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100 max-h-[480px]">
          <img
            src={blog.imageUrl}
            alt={blog.title}
            className="w-full h-full object-cover max-h-[480px]"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Main Body Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs mb-8">
        <div className="text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line space-y-4 font-normal">
          {blog.content}
        </div>
      </div>

      {/* Structured Conclusion Section */}
      {blog.conclusion && (
        <section className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="font-bold text-blue-950 text-base sm:text-lg mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
            Conclusion & Key Takeaways
          </h3>
          <p className="text-slate-700 text-sm sm:text-base leading-relaxed pl-7">
            {blog.conclusion}
          </p>
        </section>
      )}

      {/* Clickable Discovery Tags */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Keywords & Tags (Click to discover related articles)
          </div>
          <div className="flex flex-wrap gap-2">
            {blog.tags.map((t, index) => (
              <Link
                key={index}
                to={`/?tag=${encodeURIComponent(t)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-xl transition"
              >
                <span>#{t}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </article>
  );
}