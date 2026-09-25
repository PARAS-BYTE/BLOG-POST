import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchPublishedBlogs } from '../services/api';
import { Search, Calendar, Tag, Clock, ArrowRight, X, Sparkles } from 'lucide-react';

/**
 * Home Page (Public Blog Listing)
 * Displays published blog posts with live search, tag filtering, and URL query support.
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial values from URL if user arrived via link (e.g., /?tag=React)
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

      // Collect all unique tags from returned blogs to show as filter badges
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

  // Sync state if URL search parameters change
  useEffect(() => {
    const urlTag = searchParams.get('tag') || '';
    const urlSearch = searchParams.get('search') || '';
    setSelectedTag(urlTag);
    setSearchQuery(urlSearch);
    loadBlogs(urlSearch, urlTag);
  }, [searchParams]);

  // Handle Search Form Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedTag);
  };

  // Handle Tag Selection / Clicking
  const handleTagClick = (tag) => {
    const newTag = selectedTag === tag ? '' : tag; // Toggle off if clicked again
    setSelectedTag(newTag);
    updateFilters(searchQuery, newTag);
  };

  // Clear all active filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSearchParams({});
    loadBlogs('', '');
  };

  // Helper to sync URL search params
  const updateFilters = (search, tag) => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (tag.trim()) params.tag = tag.trim();
    setSearchParams(params);
    loadBlogs(search, tag);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      
      {/* Editorial Header Section */}
      <section className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Official Engineering Journal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          UTSAN<span className="text-blue-600">OVA</span> Insights & Blogs
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Explore curated articles on modern full-stack development, backend architecture, system design, and software best practices.
        </p>
      </section>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs mb-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search articles by title, keyword, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  updateFilters('', selectedTag);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                title="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Quick Tag Pill Filters */}
        {availableTags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Filter by tag:
            </span>
            {availableTags.map((tag) => {
              const isActive = selectedTag.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
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

        {/* Active Filter Notice */}
        {(selectedTag || searchQuery) && (
          <div className="mt-3 flex items-center justify-between bg-blue-50/70 border border-blue-100 px-3.5 py-1.5 rounded-lg text-xs text-blue-900">
            <span>
              Showing results for:{' '}
              {searchQuery && <strong className="mr-2">"{searchQuery}"</strong>}
              {selectedTag && <span>Tag: <strong>#{selectedTag}</strong></span>}
            </span>
            <button
              onClick={clearFilters}
              className="text-blue-700 hover:text-blue-900 font-semibold underline ml-3 cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Blog Cards Grid */}
      {loading ? (
        // Clean skeleton loading cards
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-5/6 mb-4"></div>
              <div className="flex gap-2">
                <div className="h-5 bg-slate-100 rounded w-12"></div>
                <div className="h-5 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        // Empty State
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl px-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">No articles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            We couldn't find any published articles matching your criteria. Try adjusting your search term or clearing the active tags.
          </p>
          <button
            onClick={clearFilters}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {blogs.map((blog) => {
            // Rough calculation of estimated reading time
            const words = blog.content ? blog.content.split(/\s+/).length : 0;
            const readTime = Math.max(1, Math.ceil(words / 150));

            return (
              <article
                key={blog._id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(blog.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {readTime} min read
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition mb-2.5 leading-snug">
                    <Link to={`/blog/${blog._id}`}>{blog.title}</Link>
                  </h2>

                  {/* Excerpt / Summary */}
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {blog.content}
                  </p>

                  {/* Tags list (clickable) */}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {blog.tags.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleTagClick(t)}
                          className="text-xs bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-md transition font-medium cursor-pointer"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer */}
                <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Published Article</span>
                  <Link
                    to={`/blog/${blog._id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    Read More <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}