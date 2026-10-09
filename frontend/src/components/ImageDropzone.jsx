import React, { useState, useRef } from 'react';
import { uploadImage, uploadMultipleImages } from '../services/api';
import { compressImage, formatBytes } from '../utils/imageCompression';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  Cloud,
  FileCheck,
  Plus,
  Star,
  Copy,
  Check,
  Layers
} from 'lucide-react';

/**
 * ImageDropzone Component
 * Interactive drag-and-drop file uploader supporting Cloudinary image hosting.
 * Supports single cover image AND multiple pictures in blog posts!
 */
export default function ImageDropzone({
  value = '',
  onChange,
  images = [],
  onChangeImages,
  onInsertMarkdown,
  label = 'Article Pictures & Cover Image'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('drop'); // 'drop' | 'url'
  const [manualUrl, setManualUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');

  const fileInputRef = useRef(null);

  // Normalize image list: ensure value is in images if images is empty
  const allImages = Array.isArray(images) && images.length > 0
    ? images
    : value ? [value] : [];

  const updateImageList = (newImages, newCover = null) => {
    if (onChangeImages) {
      onChangeImages(newImages);
    }
    if (newCover !== null && onChange) {
      onChange(newCover);
    } else if (newImages.length > 0 && !value && onChange) {
      onChange(newImages[0]);
    } else if (newImages.length === 0 && onChange) {
      onChange('');
    }
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return `Invalid type for ${file.name}. Only JPG, PNG, WEBP, GIF, SVG are permitted.`;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return `${file.name} exceeds 10MB size limit.`;
    }
    return null;
  };

  // Upload multiple files or single file
  const handleFilesUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadError('');

    // Validate all files
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        setUploadError(err);
        return;
      }
    }

    try {
      setIsUploading(true);
      const newUrls = [];

      // Try batch upload via uploadMultipleImages API
      try {
        const batchRes = await uploadMultipleImages(files);
        if (batchRes && Array.isArray(batchRes.urls) && batchRes.urls.length > 0) {
          newUrls.push(...batchRes.urls);
        }
      } catch (batchErr) {
        // Fallback to uploading individually
        console.warn('Batch upload route fallback, uploading individually:', batchErr);
        for (const file of files) {
          let fileToUpload = file;
          try {
            const comp = await compressImage(file, { maxWidth: 1600, maxHeight: 1200, quality: 0.82 });
            if (comp?.file) fileToUpload = comp.file;
          } catch {
            // bypass compression on failure
          }
          const res = await uploadImage(fileToUpload);
          if (res?.url) {
            newUrls.push(res.url);
          }
        }
      }

      if (newUrls.length > 0) {
        const combined = Array.from(new Set([...allImages, ...newUrls]));
        const nextCover = value || newUrls[0];
        updateImageList(combined, nextCover);
        setUploadSuccessInfo({
          message: `${newUrls.length} picture${newUrls.length > 1 ? 's' : ''} uploaded successfully!`
        });
      } else {
        throw new Error('No image URLs were returned from the upload server.');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload pictures.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and Drop event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(Array.from(e.target.files));
    }
  };

  const handleAddManualUrl = (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    // Support comma or newline separated URLs
    const splitUrls = manualUrl
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/'));

    if (splitUrls.length === 0) {
      setUploadError('Please provide a valid image URL starting with http:// or https://');
      return;
    }

    const combined = Array.from(new Set([...allImages, ...splitUrls]));
    const nextCover = value || splitUrls[0];
    updateImageList(combined, nextCover);
    setManualUrl('');
    setUploadError('');
    setUploadSuccessInfo({
      message: `Added ${splitUrls.length} image URL${splitUrls.length > 1 ? 's' : ''}.`
    });
  };

  const handleSetCover = (imgUrl) => {
    if (onChange) onChange(imgUrl);
    setUploadSuccessInfo({ message: 'Primary cover image updated!' });
    setTimeout(() => setUploadSuccessInfo(null), 3000);
  };

  const handleRemoveImage = (imgUrl) => {
    const nextImages = allImages.filter((url) => url !== imgUrl);
    let nextCover = value;
    if (value === imgUrl) {
      nextCover = nextImages.length > 0 ? nextImages[0] : '';
    }
    updateImageList(nextImages, nextCover);
  };

  const handleCopyMarkdown = (imgUrl) => {
    const markdown = `![Blog Image](${imgUrl})`;
    if (onInsertMarkdown) {
      onInsertMarkdown(markdown);
    }
    navigator.clipboard?.writeText(markdown).then(() => {
      setCopiedUrl(imgUrl);
      setTimeout(() => setCopiedUrl(''), 2000);
    });
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {label}
          </label>
          {allImages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {allImages.length} {allImages.length === 1 ? 'Picture' : 'Pictures'} Added
            </span>
          )}
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('drop')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'drop'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Drop / Upload Files</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Add Direct URLs</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError('')}
            className="text-rose-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Info Banner */}
      {uploadSuccessInfo?.message && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="flex-1">{uploadSuccessInfo.message}</span>
          <button
            type="button"
            onClick={() => setUploadSuccessInfo(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold ml-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Tab: Manual URL Input */}
      {activeTab === 'url' && (
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                placeholder="Paste image URL (https://... or comma separated URLs for multiple)"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualUrl(e)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={handleAddManualUrl}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add URL</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Paste one or more image links to attach multiple pictures to this post.
          </p>
        </div>
      )}

      {/* Tab: Drag & Drop Area */}
      {activeTab === 'drop' && (
        <div>
          {/* Hidden File Input with Multiple Selection enabled */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
          />

          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-blue-50/20 dark:hover:bg-slate-800/40'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Uploading pictures to Cloudinary cloud...
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Optimizing dimensions and generating secure URLs
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {isDragging ? 'Drop your images here' : 'Drop multiple pictures here, or click to browse'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select 1 or more images (JPG, PNG, WEBP, GIF, SVG up to 10MB each)
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 rounded-full">
                  <Cloud className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  Multiple Pictures & Cloudinary Cloud Hosting Supported
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          MULTI-IMAGE GALLERY & SELECTION MANAGEMENT GRID
          ==================================================== */}
      {allImages.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Article Picture Gallery ({allImages.length})
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                • Star an image to set it as Primary Cover
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 rounded-lg transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More Pictures</span>
            </button>
          </div>

          {/* Grid of Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allImages.map((imgUrl, idx) => {
              const isCover = (value === imgUrl) || (!value && idx === 0);
              const isCopied = copiedUrl === imgUrl;

              return (
                <div
                  key={`${imgUrl}-${idx}`}
                  className={`relative rounded-xl overflow-hidden border transition group bg-slate-50 dark:bg-slate-950 ${
                    isCover
                      ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={imgUrl}
                      alt={`Blog picture ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {isCover ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        Primary Cover
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/70 text-slate-200 backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Actions Bar under thumbnail */}
                  <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                    {/* Make Cover Button */}
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={() => handleSetCover(imgUrl)}
                        className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer flex items-center gap-1"
                        title="Set as primary article cover image"
                      >
                        <Star className="w-3 h-3 text-slate-400" />
                        <span>Set Cover</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 pl-1">
                        <Check className="w-3 h-3" /> Cover Image
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Copy Markdown to insert in body */}
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(imgUrl)}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title={isCopied ? "Copied markdown to clipboard!" : "Copy markdown ![Image](url) to insert into article text"}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Open Full Size */}
                      <a
                        href={imgUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View image full size"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Remove Image */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imgUrl)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Remove picture from article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
            <span>
              💡 <strong>Tip:</strong> Click the copy icon to insert <code>![Image](url)</code> anywhere inside the article markdown body, or let them appear in the interactive photo carousel on the article page!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
