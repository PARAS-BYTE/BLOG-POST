import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchPublishedBlogs } from '../services/api';
import {
  Search,
  Calendar,
  Tag,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  BookOpen,
  ArrowDown,
  Shield
} from 'lucide-react';

/**
 * Home Page (Public Blog Listing)
 * Incorporates the colors, smooth radial lighting, and pill shapes from the UTSANOVA
 * reference design while structuring the content authentically for a technical blog.
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTag = searchParams.get('tag') || '';
  const initialSearch = searchParams.get('search') || '';

  const [blogs, setBlogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch blogs from API based on search and tag filters
  const loadBlogs = async (searchTerm = '', tagTerm = '') => {
    try {
      setLoading(true);
      const data = await fetchPublishedBlogs(searchTerm, tagTerm);
      setBlogs(data);

      if (!tagTerm && !searchTerm) {
        const uniqueTags = Array.from(
          new Set(data.flatMap((b) => (Array.isArray(b.tags) ? b.tags : [])))
        ).filter(Boolean);
        setAvailableTags(uniqueTags);
      }
    } catch (err) {
      console.error('Failed to load published blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlTag = searchParams.get('tag') || '';
    const urlSearch = searchParams.get('search') || '';
    setSelectedTag(urlTag);
    setSearchQuery(urlSearch);
    loadBlogs(urlSearch, urlTag);
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedTag);
  };

  const handleTagClick = (tag) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    updateFilters(searchQuery, newTag);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSearchParams({});
    loadBlogs('', '');
  };

  const updateFilters = (search, tag) => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (tag.trim()) params.tag = tag.trim();
    setSearchParams(params);
    loadBlogs(search, tag);
  };

  const scrollToArticles = () => {
    const section = document.getElementById('articles-feed');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ========================================================================= */}
      {/* UTSANOVA SIGNATURE HERO SECTION (Colors & pill shapes from reference)     */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B132B] via-[#101A38] to-[#152245] text-white pt-16 pb-20 px-4 sm:px-6">
        
        {/* Soft Ambient Radial Glow (from reference image) */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-blue-500/10 blur-[130px] pointer-events-none rounded-full"></div>

        <div className="relative max-w-4xl mx-auto text-center">
          
          {/* Blog Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-blue-300 text-xs font-semibold mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>UTSANOVA ENGINEERING & TECH JOURNAL</span>
          </div>

          {/* Authentic Blog Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-white mb-5">
            Engineering Ideas, Modern Architecture & Tech Insights
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Explore deep dives into scalable backend systems, cloud infrastructure, modern React applications, and AI agent workflows curated by UTSANOVA engineers.
          </p>

          {/* Integrated Glass Pill Search Bar (Adopting reference pill shapes) */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-4 text-slate-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles by title, keyword, or tech tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-[#0B132B]/80 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateFilters('', selectedTag);
                  }}
                  className="absolute right-24 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 px-5 py-2 rounded-full bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow-md cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Pill Action Buttons (Pill geometry from reference image) */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={scrollToArticles}
              className="px-7 py-2.5 rounded-full bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              Explore Articles <ArrowDown className="w-3.5 h-3.5" />
            </button>

            <Link
              to="/admin/login"
              className="px-7 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-md font-semibold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Admin Portal
            </Link>
          </div>

          {/* Subtle Carousel Dots (Design element from reference image) */}
          <div className="flex items-center justify-center gap-2 mt-12 opacity-60">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* TOPIC PILLS BAR                                                           */}
      {/* ========================================================================= */}
      <div id="explore-topics" className="bg-[#0B132B] border-b border-slate-800 py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider flex-shrink-0">
            <Tag className="w-3.5 h-3.5 text-blue-400" /> Topics:
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {availableTags.map((tag) => {
              const isActive = selectedTag.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 rounded-full transition font-medium cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-slate-700'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {(selectedTag || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 font-semibold underline flex-shrink-0 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ARTICLES FEED SECTION                                                     */}
      {/* ========================================================================= */}
      <section id="articles-feed" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {selectedTag ? `Articles Tagged: #${selectedTag}` : searchQuery ? `Search Results for "${searchQuery}"` : 'Recent Engineering Articles'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {blogs.length} published {blogs.length === 1 ? 'article' : 'articles'}
            </p>
          </div>
          
          {(selectedTag || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full"
            >
              Clear Active Filters
            </button>
          )}
        </div>

        {/* Blog Cards Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse">
                <div className="h-48 bg-slate-200 w-full"></div>
                <div className="p-5">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-5 bg-slate-200 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded w-full mb-1"></div>
                  <div className="h-4 bg-slate-100 rounded w-4/5 mb-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No articles found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              We couldn't find any articles matching your search criteria. Try using different keywords or resetting filters.
            </p>
            <button
              onClick={clearFilters}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2 rounded-full transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
              const readTime = Math.max(1, Math.ceil(wordCount / 150));

              return (
                <article
                  key={blog._id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div>
                    {/* Blog Cover Image */}
                    {blog.imageUrl ? (
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      // Branded Navy Fallback Banner
                      <div className="h-48 bg-gradient-to-tr from-[#0B132B] via-[#101A38] to-[#1E293B] flex items-center justify-center p-6 text-center relative overflow-hidden">
                        <span className="text-4xl font-extrabold text-white/10 absolute -right-4 -bottom-4 select-none">
                          UTSAN<span className="text-blue-500/20">OVA</span>
                        </span>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold text-xl shadow-inner">
                          U
                        </div>
                      </div>
                    )}

                    {/* Card Content Body */}
                    <div className="p-5">
                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(blog.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {readTime} min read
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition mb-2 leading-snug line-clamp-2">
                        <Link to={`/blog/${blog._id}`}>{blog.title}</Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                        {blog.content}
                      </p>

                      {/* Tags as Pill Badges */}
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {blog.tags.slice(0, 3).map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleTagClick(t)}
                              className="text-[11px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2.5 py-0.5 rounded-full transition font-medium cursor-pointer"
                            >
                              #{t}
                            </button>
                          ))}
                          {blog.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{blog.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Bar */}
                  <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-auto flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Article</span>
                    <Link
                      to={`/blog/${blog._id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      Read Article <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                </article>
              );
            })}
          </div>
        )}

      </section>

    </div>
  );
}