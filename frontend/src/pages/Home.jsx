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
  ChevronRight,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Check,
  Flame,
  ArrowUpDown,
  Sparkles,
  Layers
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
 * Implements:
 * - Sort Blogs: Latest, Oldest, Popular (Feature 9)
 * - Popular Posts quick filter (Feature 7)
 * - Recent Posts quick filter (Feature 8)
 * - Blog View Counter badge (Feature 3)
 * - Like / Unlike counter badge (Feature 1)
 * - Comments count badge (Feature 2)
 * - Reading Time indicator (Feature 5)
 * - Copy Blog Link directly from card (Feature 11)
 * - Search bar, tag filter, and responsive pagination
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTag = searchParams.get('tag') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'latest';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  const [blogs, setBlogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [sortOption, setSortOption] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [limit, setLimit] = useState(6);

  // Fetch blogs from API based on search, tag, pagination, and sorting parameters
  const loadBlogs = async (searchTerm = '', tagTerm = '', pageNum = 1, limitNum = limit, sortTerm = sortOption) => {
    try {
      setLoading(true);
      const data = await fetchPublishedBlogs(searchTerm, tagTerm, pageNum, limitNum, sortTerm);

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
    const urlSort = searchParams.get('sort') || 'latest';
    const urlPage = parseInt(searchParams.get('page'), 10) || 1;

    setSelectedTag(urlTag);
    setSearchQuery(urlSearch);
    setSortOption(urlSort);
    setCurrentPage(urlPage);
    loadBlogs(urlSearch, urlTag, urlPage, limit, urlSort);
  }, [searchParams, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedTag, sortOption);
  };

  const handleTagClick = (tag) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    updateFilters(searchQuery, newTag, sortOption);
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    updateFilters(searchQuery, selectedTag, newSort);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedTag.trim()) params.tag = selectedTag.trim();
    if (sortOption !== 'latest') params.sort = sortOption;
    if (newPage > 1) params.page = newPage;
    setSearchParams(params);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedTag.trim()) params.tag = selectedTag.trim();
    if (sortOption !== 'latest') params.sort = sortOption;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSortOption('latest');
    setSearchParams({});
  };

  const updateFilters = (search, tag, sort) => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (tag.trim()) params.tag = tag.trim();
    if (sort && sort !== 'latest') params.sort = sort;
    // Resetting to page 1 on filter update
    setSearchParams(params);
  };

  // Feature 11: Copy blog link directly from card
  const handleCopyCardLink = (e, blogId) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/blog/${blogId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedId(blogId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        
        {/* Simple & Clean Blog Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
              UTSAN<span className="text-blue-600 dark:text-blue-400">OVA</span> Blog
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Discover insightful technical deep-dives, architecture guides, and engineering updates.
            </p>
          </div>

          {/* Feature 7 & 8: Quick category tabs (Latest, Popular, Recent) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSortChange('latest')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                sortOption === 'latest'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Latest</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('popular')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                sortOption === 'popular'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Popular</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('oldest')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                sortOption === 'oldest'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Oldest</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles by title, keyword, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateFilters('', selectedTag, sortOption);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Feature 9: Sort Blogs Selector */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2.5 pr-8 rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  aria-label="Sort blogs by"
                >
                  <option value="latest">Sort: Latest First</option>
                  <option value="popular">Sort: Most Popular</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Simple Tag Pills */}
          {availableTags.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
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
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Notice */}
          {(selectedTag || searchQuery || sortOption !== 'latest') && (
            <div className="mt-3 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 px-3.5 py-1.5 rounded-lg text-xs text-blue-900 dark:text-blue-200">
              <span className="flex items-center gap-2 flex-wrap">
                <span>Active filters:</span>
                {searchQuery && <strong>"{searchQuery}"</strong>}
                {selectedTag && <span>Tag: <strong>#{selectedTag}</strong></span>}
                {sortOption !== 'latest' && (
                  <span className="bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    Sorted by: <strong>{sortOption === 'popular' ? 'Popularity' : 'Oldest'}</strong>
                  </span>
                )}
              </span>
              <button
                onClick={clearFilters}
                className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold underline ml-3 cursor-pointer shrink-0"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Section Title & Count */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-2">
            {sortOption === 'popular' && <Flame className="w-4 h-4 text-amber-500" />}
            {selectedTag
              ? `Articles Tagged: #${selectedTag}`
              : searchQuery
              ? `Search Results for "${searchQuery}"`
              : sortOption === 'popular'
              ? 'Most Popular Articles'
              : sortOption === 'oldest'
              ? 'Earliest Articles'
              : 'All Published Articles'}
          </span>
          <span>
            {loading ? (
              <span className="inline-block w-28 h-4 bg-slate-200/80 animate-pulse rounded" />
            ) : totalBlogs > 0 ? (
              <>
                Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{(currentPage - 1) * limit + 1}</strong>–
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{Math.min(currentPage * limit, totalBlogs)}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalBlogs}</strong> {totalBlogs === 1 ? 'article' : 'articles'}
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
              <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 w-full"></div>
                <div className="p-5">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-full mb-1"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-4/5 mb-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No articles found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              We couldn't find any articles matching your search criteria. Try using different keywords or resetting filters.
            </p>
            <button
              onClick={clearFilters}
              className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2 rounded-full transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              // Feature 5: Reading time
              const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
              const readTime = Math.max(1, Math.ceil(wordCount / 200));
              const isCardCopied = copiedId === blog._id;
              const hasMultipleImages = Array.isArray(blog.images) && blog.images.length > 1;

              return (
                <article
                  key={blog._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Blog Cover Image */}
                    {blog.imageUrl ? (
                      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-950">
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />

                        {/* Multi-Photo Badge Indicator */}
                        {hasMultipleImages && (
                          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 border border-white/20 shadow-sm">
                            <Layers className="w-3 h-3 text-blue-400" />
                            <span>{blog.images.length} Photos</span>
                          </div>
                        )}

                        {/* Feature 11: Quick Copy Link on Card */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyCardLink(e, blog._id)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-sm backdrop-blur-xs transition cursor-pointer border border-slate-200/50 dark:border-slate-700"
                          title="Copy link to this article"
                        >
                          {isCardCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
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

                        {/* Feature 11: Quick Copy Link on Fallback Card */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyCardLink(e, blog._id)}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-xs transition cursor-pointer"
                          title="Copy link to this article"
                        >
                          {isCardCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Card Content Body */}
                    <div className="p-5">
                      {/* Metadata: Feature 5 (Reading time) & Feature 3 (Views counter) & Feature 1 (Likes) */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mb-2">
                        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(blog.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        {/* Feature 5: Reading Time */}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {readTime} min read
                        </span>
                        <span>•</span>
                        {/* Feature 3: Blog View Counter */}
                        <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                          <Eye className="w-3 h-3 text-blue-500" />
                          {(blog.views || 0).toLocaleString()}
                        </span>
                        <span>•</span>
                        {/* Feature 1: Likes Count */}
                        <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                          <Heart className={`w-3 h-3 ${(blog.likes || 0) > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                          {blog.likes || 0}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition mb-2 leading-snug line-clamp-2">
                        <Link to={`/blog/${blog._id}`}>{blog.title}</Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
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
                              className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 px-2.5 py-0.5 rounded-full transition font-medium cursor-pointer"
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
                  <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-indigo-400" />
                        {Array.isArray(blog.comments) ? blog.comments.length : 0}
                      </span>
                    </div>

                    <Link
                      to={`/blog/${blog._id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
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
            className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            {/* Range info and items per page selector */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span>
                Page <strong className="text-slate-900 dark:text-slate-100 font-semibold">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{totalPages}</strong>
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

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
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-700 bg-slate-100 dark:bg-slate-800'
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
                className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
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
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
                className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
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