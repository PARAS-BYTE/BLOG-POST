import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  fetchBlogById,
  fetchRelatedBlogs,
  likeBlog,
  addComment,
  deleteBlog
} from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { stripMarkdown } from '../utils/markdownUtils';
import {
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Share2,
  Check,
  Heart,
  MessageSquare,
  Eye,
  Send,
  User,
  Trash2,
  Edit3,
  BookOpen,
  ArrowRight,
  Flame,
  AlertCircle,
  Sparkles,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Layers
} from 'lucide-react';

/**
 * Get or create unique client ID for like tracking
 */
function getClientId() {
  let cid = localStorage.getItem('utsanova_client_id');
  if (!cid) {
    cid = 'client_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('utsanova_client_id', cid);
  }
  return cid;
}

/**
 * BlogDetail Page
 * Implements:
 * 1. Like / Unlike Blog (Feature 1)
 * 2. Comments System (Feature 2)
 * 3. Blog View Counter (Feature 3)
 * 5. Reading Time Calculation (Feature 5)
 * 6. Related Posts (Feature 6)
 * 11. Copy Blog Link (Feature 11)
 * 12. Delete Confirmation Modal for Admins (Feature 12)
 * 13. Reading Progress Bar (Feature 13)
 */
export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Blog data state
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Multi-image gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Feature 11: Copy Link feedback
  const [copied, setCopied] = useState(false);
  const [floatingCopied, setFloatingCopied] = useState(false);

  // Feature 13: Reading Progress
  const [readingProgress, setReadingProgress] = useState(0);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  // Feature 1: Likes
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Feature 2: Comments
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  // Feature 6: Related Posts
  const [relatedPosts, setRelatedPosts] = useState([]);

  // Feature 12: Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingBlog, setIsDeletingBlog] = useState(false);

  // Admin status check
  const token = localStorage.getItem('adminToken');

  // Track scroll for Feature 13: Reading Progress Bar & Floating Island
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
        setReadingProgress(progress);
      }
      // Reveal floating engagement bar after scrolling past header
      setShowFloatingBar(scrollTop > 380);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch blog, related posts, and initial interaction state
  useEffect(() => {
    const loadBlogAndRelated = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchBlogById(id);
        setBlog(data);
        setLikesCount(data.likes || 0);
        setComments(Array.isArray(data.comments) ? data.comments : []);

        // Check if current client has liked this post
        const clientId = getClientId();
        const hasLiked = Array.isArray(data.likedBy) && data.likedBy.includes(clientId);
        setIsLiked(hasLiked);

        // Fetch related posts (Feature 6)
        try {
          const related = await fetchRelatedBlogs(id);
          setRelatedPosts(Array.isArray(related) ? related : []);
        } catch (relErr) {
          console.warn('Could not fetch related posts:', relErr);
        }
      } catch (err) {
        console.error('Error fetching blog detail:', err);
        setError('This article could not be found or has not been published yet.');
      } finally {
        setLoading(false);
      }
    };

    loadBlogAndRelated();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Feature 11: Copy blog link
  const handleCopyLink = (isFloating = false) => {
    const url = window.location.href;
    const copyToClipboard = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(url);
      }
      const input = document.createElement('textarea');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      return Promise.resolve();
    };

    copyToClipboard().then(() => {
      if (isFloating) {
        setFloatingCopied(true);
        setTimeout(() => setFloatingCopied(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }).catch((err) => {
      console.error('Clipboard copy failed:', err);
    });
  };

  // Feature 1: Like / Unlike blog post
  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const clientId = getClientId();
    const nextLikedState = !isLiked;
    const nextLikesCount = nextLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);

    // Optimistic UI
    setIsLiked(nextLikedState);
    setLikesCount(nextLikesCount);

    try {
      const res = await likeBlog(id, clientId);
      if (res) {
        setLikesCount(res.likes);
        setIsLiked(res.isLiked);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert optimistic update
      setIsLiked(!nextLikedState);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  // Scroll smoothly to discussion section
  const scrollToComments = () => {
    const el = document.getElementById('comments-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Feature 2: Post comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentName.trim() || !commentContent.trim()) {
      setCommentError('Please provide both your name and a comment message.');
      return;
    }

    try {
      setIsSubmittingComment(true);
      setCommentError('');
      const res = await addComment(id, {
        name: commentName.trim(),
        content: commentContent.trim()
      });

      if (res && res.comments) {
        setComments(res.comments);
        setCommentContent('');
        setCommentSuccess('Your comment has been posted successfully!');
        setTimeout(() => setCommentSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setCommentError(err.response?.data?.message || 'Could not post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Feature 12: Confirm delete blog
  const handleConfirmDelete = async () => {
    try {
      setIsDeletingBlog(true);
      await deleteBlog(id);
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete blog:', err);
      alert(err.response?.data?.message || 'Failed to delete blog post.');
    } finally {
      setIsDeletingBlog(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <div className="inline-block w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Preparing article for reading...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-xl mx-auto px-4 py-28 text-center">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Article Not Available</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {error || 'This article could not be located or may have been unlisted.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Articles
          </Link>
        </div>
      </div>
    );
  }

  // Feature 5: Reading Time calculation (200 words per minute)
  const wordCount = blog.content ? blog.content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Multi-image collection for article
  const allBlogImages = Array.isArray(blog.images) && blog.images.length > 0
    ? blog.images
    : (blog.imageUrl ? [blog.imageUrl] : []);

  return (
    <>
      {/* ====================================================
          FEATURE 13: READING PROGRESS BAR (Glowing Gradient)
          ==================================================== */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none transition-all duration-75"
        style={{
          width: `${readingProgress}%`,
          background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #38bdf8 100%)',
          boxShadow: '0 0 10px rgba(37, 99, 235, 0.6)'
        }}
        role="progressbar"
        aria-valuenow={Math.round(readingProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* ====================================================
          FLOATING ENGAGEMENT ISLAND (Medium / Substack Style)
          Appears dynamically while scrolling down the post
          ==================================================== */}
      {showFloatingBar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full px-4 py-2 shadow-xl shadow-slate-900/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isLiked
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/60'
            }`}
            title={isLiked ? 'Unlike article' : 'Like article'}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'
              }`}
            />
            <span>{likesCount}</span>
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* Jump to comments button */}
          <button
            type="button"
            onClick={scrollToComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 transition cursor-pointer"
            title="Jump to discussion"
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>{comments.length}</span>
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* Copy link button */}
          <button
            type="button"
            onClick={() => handleCopyLink(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Copy article link"
          >
            {floatingCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px]">Share</span>
              </>
            )}
          </button>

          {/* Read percentage pill */}
          <div className="pl-1 text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
            {Math.round(readingProgress)}%
          </div>
        </div>
      )}

      {/* Main Editorial Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Top Breadcrumb & Control Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800 gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs sm:text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>

          <div className="flex items-center gap-2">
            {/* Admin Quick Edit/Delete controls if logged in */}
            {token && (
              <div className="flex items-center gap-1.5 mr-2">
                <Link
                  to={`/admin/edit/${blog._id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition shadow-2xs"
                  title="Edit this post"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  title="Delete post"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}

            {/* Feature 11: Copy Blog Link Button */}
            <button
              onClick={() => handleCopyLink(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-3.5 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
              title="Copy article link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied Link!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editorial Article Header */}
        <header className="mb-10">
          {/* Category & Tags Pill Banner */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {blog.tags.slice(0, 3).map((tag, idx) => (
                <Link
                  key={idx}
                  to={`/?tag=${encodeURIComponent(tag)}`}
                  className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-900/60 px-3 py-1 rounded-full transition"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Article Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.18] mb-6">
            {blog.title}
          </h1>

          {/* Author & Publication Metadata Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
            {/* Author info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
                U
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>UTSAN<span className="text-blue-600 dark:text-blue-400">OVA</span> Engineering</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Verified Author"></span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Reading stats pill row: Feature 5 (Reading time) & Feature 3 (Views) & Feature 1 (Likes) */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
              {/* Feature 5: Reading Time */}
              <div
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl font-medium"
                title="Estimated reading duration"
              >
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{readTime} min read</span>
              </div>

              {/* Feature 3: Blog View Counter */}
              <div
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl font-medium"
                title="Total page views"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>{(blog.views || 0).toLocaleString()} {blog.views === 1 ? 'view' : 'views'}</span>
              </div>

              {/* Feature 1: Likes indicator */}
              <div
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl font-medium"
                title="Total reader likes"
              >
                <Heart className={`w-3.5 h-3.5 ${likesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                <span>{likesCount}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ====================================================
            FEATURE: MULTI-IMAGE GALLERY & INTERACTIVE CAROUSEL
            ==================================================== */}
        {allBlogImages.length > 0 && (
          <div className="mb-10 space-y-3">
            {allBlogImages.length > 1 ? (
              /* Interactive Carousel for Multiple Pictures */
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 group">
                {/* Main Active Picture */}
                <div className="relative h-[340px] sm:h-[460px] md:h-[520px] w-full flex items-center justify-center bg-slate-950/20">
                  <img
                    src={allBlogImages[activeImageIndex]}
                    alt={`${blog.title} - Picture ${activeImageIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Gradient bottom overlay for counter */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* Top Left: Picture Counter Badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-white/20">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Photo {activeImageIndex + 1} of {allBlogImages.length}
                    </span>
                  </div>

                  {/* Top Right: Lightbox Expand Button */}
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition shadow-md cursor-pointer border border-white/20"
                      title="View full screen picture"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Left Navigation Arrow */}
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? allBlogImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition shadow-md cursor-pointer border border-white/20 opacity-90 sm:opacity-0 group-hover:opacity-100"
                    title="Previous picture"
                    aria-label="Previous picture"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  {/* Right Navigation Arrow */}
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === allBlogImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center transition shadow-md cursor-pointer border border-white/20 opacity-90 sm:opacity-0 group-hover:opacity-100"
                    title="Next picture"
                    aria-label="Next picture"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Thumbnails Navigation Strip */}
                <div className="p-3 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto">
                  {allBlogImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/30 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      title={`Jump to picture ${idx + 1}`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      {activeImageIndex === idx && (
                        <span className="absolute inset-0 bg-blue-600/10 pointer-events-none" />
                      )}
                    </button>
                  ))}
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-auto shrink-0 pl-2">
                    Click any thumbnail to switch
                  </span>
                </div>
              </div>
            ) : (
              /* Single Cover Picture */
              <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 max-h-[520px]">
                <img
                  src={allBlogImages[0]}
                  alt={blog.title}
                  className="w-full h-full object-cover max-h-[520px]"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Main Body Reading Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] mb-10 text-slate-800 dark:text-slate-100">
          <MarkdownRenderer content={blog.content} />
        </div>

        {/* Structured Executive Conclusion & Key Takeaways Section */}
        {blog.conclusion && (
          <section className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-200/90 dark:border-blue-900/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-10 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3 text-blue-950 dark:text-blue-200 font-extrabold text-base sm:text-lg">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3>Conclusion & Key Takeaways</h3>
            </div>
            <div className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed pl-1 pt-1">
              <MarkdownRenderer content={blog.conclusion} />
            </div>
          </section>
        )}

        {/* Clickable Discovery Tags Card */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs mb-10">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Related Topics & Keywords
            </div>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((t, index) => (
                <Link
                  key={index}
                  to={`/?tag=${encodeURIComponent(t)}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 hover:border-blue-200 px-3 py-1.5 rounded-xl transition"
                >
                  <span>#{t}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================
            FEATURE 1: LIKE / UNLIKE POST INTERACTION CARD
            ==================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 shadow-2xs mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={isLiking}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold transition cursor-pointer shadow-xs ${
                isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100/80'
                  : 'bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 text-slate-700 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-800'
              }`}
              title={isLiked ? 'Click to unlike this article' : 'Click to like this article'}
            >
              <Heart
                className={`w-5 h-5 transition-transform ${
                  isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'
                }`}
              />
              <span>{isLiked ? 'Liked' : 'Like this article'}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold ml-1">
                {likesCount}
              </span>
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              {likesCount === 0
                ? 'Enjoyed reading? Be the first to give a like!'
                : `${likesCount} reader${likesCount === 1 ? '' : 's'} liked this article`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyLink(false)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Share Article</span>
            </button>
          </div>
        </div>

        {/* ====================================================
            FEATURE 2: COMMENTS SECTION
            ==================================================== */}
        <section id="comments-section" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xs mb-12">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Discussion & Comments ({comments.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Join the conversation</span>
          </div>

          {/* Comment submission feedback alerts */}
          {commentSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{commentSuccess}</span>
            </div>
          )}

          {commentError && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{commentError}</span>
            </div>
          )}

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-8 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Leave a Comment
            </h4>
            
            <div className="grid grid-cols-1 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex Johnson"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Your Comment Message *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share your perspective, questions, or feedback on this article..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="w-full p-3.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingComment ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </form>

          {/* Comment List */}
          {comments.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2 border border-slate-100 dark:border-slate-800">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">No comments yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Be the first to share your thoughts and start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {comments.map((c, index) => (
                <div
                  key={c._id || index}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 rounded-2xl transition shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200/60 dark:border-blue-800 shadow-2xs">
                        {(c.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {c.name}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pl-10 whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ====================================================
            FEATURE 6: RELATED POSTS
            ==================================================== */}
        {relatedPosts.length > 0 && (
          <section className="mt-14 pt-8 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Related Articles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Continue exploring technical topics curated for you
                </p>
              </div>
              <Link
                to="/"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 inline-flex items-center gap-1 transition"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {relatedPosts.map((post) => {
                const pWords = post.content ? post.content.split(/\s+/).length : 0;
                const pTime = Math.max(1, Math.ceil(pWords / 200));

                return (
                  <article
                    key={post._id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      {post.imageUrl ? (
                        <div className="h-36 overflow-hidden bg-slate-100 dark:bg-slate-950">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-36 bg-gradient-to-tr from-[#0B132B] via-[#101A38] to-[#1E293B] flex items-center justify-center p-4">
                          <span className="text-white font-extrabold text-sm tracking-wider">
                            UTSAN<span className="text-blue-400">OVA</span>
                          </span>
                        </div>
                      )}

                      <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-medium">
                          <span>{pTime} min read</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Eye className="w-3 h-3 text-blue-500" />
                            {post.views || 0}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition text-sm leading-snug line-clamp-2 mb-2">
                          <Link to={`/blog/${post._id}`}>{post.title}</Link>
                        </h4>

                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {stripMarkdown(post.content || '')}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-4 pt-0">
                      <Link
                        to={`/blog/${post._id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 inline-flex items-center gap-1 transition"
                      >
                        Read Post <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Feature 12: Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={blog?.title || ''}
          itemName="article"
          isDeleting={isDeletingBlog}
        />

        {/* Fullscreen Lightbox Modal for Multi-picture Viewing */}
        {isLightboxOpen && allBlogImages.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Lightbox Bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20">
                  {activeImageIndex + 1} / {allBlogImages.length}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
                  {blog.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
                title="Close lightbox"
              >
                ✕
              </button>
            </div>

            {/* Lightbox Main Image */}
            <div className="relative max-w-5xl max-h-[80vh] flex items-center justify-center">
              <img
                src={allBlogImages[activeImageIndex]}
                alt={`${blog.title} - Full size`}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              />

              {allBlogImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? allBlogImages.length - 1 : prev - 1))}
                    className="absolute -left-12 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20"
                    title="Previous"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === allBlogImages.length - 1 ? 0 : prev + 1))}
                    className="absolute -right-12 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20"
                    title="Next"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Thumbnails Strip */}
            {allBlogImages.length > 1 && (
              <div className="absolute bottom-4 inset-x-4 flex justify-center items-center gap-2 overflow-x-auto py-2">
                {allBlogImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                      activeImageIndex === idx ? 'border-blue-400 scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </article>
    </>
  );
}