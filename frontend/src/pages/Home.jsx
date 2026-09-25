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
  Play,
  Sparkles,
  BookOpen
} from 'lucide-react';

/**
 * Home Page (Public Blog Listing)
 * Features the signature UTSANOVA corporate hero banner (matching the official site),
 * live search, tag discovery, and rich blog cards with cover image support.
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial filter values from URL if user arrived via link (e.g. /?tag=React)
  const initialTag = searchParams.get('tag') || '';
  const initialSearch = searchParams.get('search') || '';

  const [blogs, setBlogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch blogs from API based on current search and tag filters
  const loadBlogs = async (searchTerm = '', tagTerm = '') => {
    try {
      setLoading(true);
      const data = await fetchPublishedBlogs(searchTerm, tagTerm);
      setBlogs(data);

      // Collect all unique tags for filter badges
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

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedTag);
  };

  // Handle Tag Selection
  const handleTagClick = (tag) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    updateFilters(searchQuery, newTag);
  };

  // Clear all filters
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

  const scrollToBlogs = () => {
    const section = document.getElementById('blog-feed');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ========================================================================= */}
      {/* UTSANOVA SIGNATURE CORPORATE HERO (As shown in official reference design) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B132B] via-[#101A38] to-[#162247] text-white pt-20 pb-24 px-4 sm:px-6">
        
        {/* Subtle Ambient Radial Lighting Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full"></div>

        <div className="relative max-w-4xl mx-auto text-center">
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-white mb-6">
            Building Scalable Digital Solutions for Tomorrow's World
          </h1>

          {/* Subheading */}
          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Utsanova Technologies Pvt Ltd is a technology-driven company creating innovative platforms, intelligent systems, and impactful digital experiences across industries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToBlogs}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition shadow-lg cursor-pointer"
            >
              Get Started
            </button>

            <Link
              to="/admin/login"
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-md font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Watch Intro
            </Link>
          </div>

          {/* Subtle Carousel Dots from Reference */}
          <div className="flex items-center justify-center gap-2 mt-16 opacity-75">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* BLOG FEED & EXPLORATION SECTION */}
      {/* ========================================================================= */}
      <section id="blog-feed" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        
        {/* Section Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Latest Publications
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Engineering Insights & Articles
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
            Discover technical guides, architectural best practices, and tutorials written by our engineering team.
          </p>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search articles by title, keyword, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateFilters('', selectedTag);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              Search
            </button>
          </form>

          {/* Quick Tag Pills */}
          {availableTags.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" /> Topics:
              </span>
              {availableTags.map((tag) => {
                const isActive = selectedTag.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Badge */}
          {(selectedTag || searchQuery) && (
            <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-lg text-xs text-blue-900">
              <span>
                Active filter:{' '}
                {searchQuery && <strong className="mr-2">"{searchQuery}"</strong>}
                {selectedTag && <span>Tag: <strong>#{selectedTag}</strong></span>}
              </span>
              <button
                onClick={clearFilters}
                className="text-blue-700 hover:text-blue-900 font-bold underline ml-3 cursor-pointer"
              >
                Clear all
              </button>
            </div>
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
                  <div className="h-6 bg-slate-200 rounded w-5/6 mb-2"></div>
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
              We couldn't find any articles matching your search. Try changing the keywords or clearing selected tags.
            </p>
            <button
              onClick={clearFilters}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg transition"
            >
              Clear Filters
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
                            // Fallback if image link is broken
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      // Branded fallback cover if no image provided
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

                      {/* Tags */}
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {blog.tags.slice(0, 3).map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleTagClick(t)}
                              className="text-[11px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2 py-0.5 rounded-md transition font-medium"
                            >
                              #{t}
                            </button>
                          ))}
                          {blog.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{blog.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5 pt-0 border-t border-slate-100/60 mt-auto flex items-center justify-between">
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