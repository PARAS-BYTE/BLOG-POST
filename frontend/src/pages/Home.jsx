import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchPublishedBlogs } from '../services/api';
import { stripMarkdown } from '../utils/markdownUtils';
import {
  Search,
  Calendar,
  Tag,
  Clock,
  ArrowRight,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/**
 * Generate smart pagination numbers array with ellipsis
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

/**
 * Home Page (Public Blog Listing)
 * Simple, clean, and modern blog interface with a straightforward search bar,
 * tag filtering, article feed, and server-side pagination for fast initial loading.
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTag = searchParams.get('tag') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  const [blogs, setBlogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [limit, setLimit] = useState(6);

  // Fetch blogs from API based on search, tag, and pagination parameters
  const loadBlogs = async (searchTerm = '', tagTerm = '', pageNum = 1, limitNum = limit) => {
    try {
      setLoading(true);
      const data = await fetchPublishedBlogs(searchTerm, tagTerm, pageNum, limitNum);

      if (Array.isArray(data)) {
        setBlogs(data);
        setTotalBlogs(data.length);
        setTotalPages(1);
        setCurrentPage(1);

        if (!tagTerm && !searchTerm) {
          const uniqueTags = Array.from(
            new Set(data.flatMap((b) => (Array.isArray(b.tags) ? b.tags : [])))
          ).filter(Boolean);
          setAvailableTags(uniqueTags);
        }
      } else if (data && data.blogs) {
        setBlogs(data.blogs);
        setTotalBlogs(data.totalBlogs || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || pageNum);

        if (data.tags && data.tags.length > 0) {
          setAvailableTags(data.tags);
        } else if (!tagTerm && !searchTerm && availableTags.length === 0) {
          const uniqueTags = Array.from(
            new Set(data.blogs.flatMap((b) => (Array.isArray(b.tags) ? b.tags : [])))
          ).filter(Boolean);
          setAvailableTags(uniqueTags);
        }
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
    const urlPage = parseInt(searchParams.get('page'), 10) || 1;

    setSelectedTag(urlTag);
    setSearchQuery(urlSearch);
    setCurrentPage(urlPage);
    loadBlogs(urlSearch, urlTag, urlPage, limit);
  }, [searchParams, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedTag);
  };

  const handleTagClick = (tag) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    updateFilters(searchQuery, newTag);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedTag.trim()) params.tag = selectedTag.trim();
    if (newPage > 1) params.page = newPage;
    setSearchParams(params);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedTag.trim()) params.tag = selectedTag.trim();
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSearchParams({});
  };

  const updateFilters = (search, tag) => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (tag.trim()) params.tag = tag.trim();
    // Do not include page in params, resetting to page 1
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        
        {/* Simple & Clean Blog Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            UTSAN<span className="text-blue-600">OVA</span> Blog
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Read the latest technical articles, tutorials, and engineering updates.
          </p>
        </div>

        {/* Simple & Clean Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
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
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
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

          {/* Simple Tag Pills */}
          {availableTags.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" /> Filter by tag:
              </span>
              {availableTags.map((tag) => {
                const isActive = selectedTag.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1 rounded-full transition font-medium cursor-pointer ${
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

        {/* Section Title & Count */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 text-xs sm:text-sm text-slate-500 font-medium">
          <span>
            {selectedTag
              ? `Articles Tagged: #${selectedTag}`
              : searchQuery
              ? `Search Results for "${searchQuery}"`
              : 'All Published Articles'}
          </span>
          <span>
            {totalBlogs > 0 ? (
              <>
                Showing <strong className="text-slate-800 font-semibold">{(currentPage - 1) * limit + 1}</strong>–
                <strong className="text-slate-800 font-semibold">{Math.min(currentPage * limit, totalBlogs)}</strong> of{' '}
                <strong className="text-slate-800 font-semibold">{totalBlogs}</strong> {totalBlogs === 1 ? 'article' : 'articles'}
              </>
            ) : (
              '0 articles'
            )}
          </span>
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
                      // Branded Fallback Banner
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
                        {stripMarkdown(blog.content)}
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

        {/* Pagination Navigation Bar */}
        {!loading && totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            {/* Range info and items per page selector */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium">
              <span>
                Page <strong className="text-slate-900 font-semibold">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 font-semibold">{totalPages}</strong>
              </span>

              <span className="text-slate-300 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Per page:</span>
                {[6, 9, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleLimitChange(num)}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      limit === num
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Previous Page Button */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition cursor-pointer shadow-2xs"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-bold select-none">
                        …
                      </span>
                    );
                  }
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/20'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition cursor-pointer shadow-2xs"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        )}

      </main>
    </div>
  );
}