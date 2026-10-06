import React, { useState, useRef } from 'react';
import { uploadImage } from '../services/api';
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
  Cloud
} from 'lucide-react';

/**
 * ImageDropzone Component
 * Interactive drag-and-drop file uploader supporting Cloudinary image hosting.
 * Allows users to drop image files directly, browse their filesystem,
 * or toggle to manual URL entry.
 */
export default function ImageDropzone({ value, onChange, label = 'Cover Image' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('drop'); // 'drop' | 'url'
  const [manualUrl, setManualUrl] = useState(value || '');

  const fileInputRef = useRef(null);

  // Synchronize manual URL if external value changes and we are in URL mode
  const handleManualUrlChange = (e) => {
    const newUrl = e.target.value;
    setManualUrl(newUrl);
    onChange(newUrl);
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return 'Invalid file type. Please upload a JPG, PNG, WEBP, GIF, or SVG image.';
    }

    // Check size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeds 10MB limit. Please choose a smaller image.';
    }

    return null;
  };

  const handleFileUpload = async (file) => {
    setUploadError('');
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadImage(file);
      
      if (res && res.url) {
        onChange(res.url);
        setManualUrl(res.url);
        setUploadSuccessInfo({
          format: res.format,
          bytes: res.bytes,
          isFallback: res.isFallback,
          message: res.message
        });
      } else {
        throw new Error('Server did not return an image URL.');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError(
        err.response?.data?.message || err.message || 'Failed to upload image. Please try again.'
      );
    } finally {
      setIsUploading(false);
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
      const droppedFile = e.dataTransfer.files[0];
      handleFileUpload(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      handleFileUpload(selectedFile);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    setManualUrl('');
    setUploadSuccessInfo(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isCloudinaryUrl = value && (value.includes('cloudinary.com') || value.includes('res.cloudinary.com'));

  return (
    <div className="space-y-2">
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
        
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('drop')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'drop'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Drop / Upload File</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Paste Direct URL</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError('')}
            className="text-rose-400 hover:text-rose-600 font-bold ml-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Manual URL Input Tab */}
      {activeTab === 'url' ? (
        <div className="space-y-2">
          <div className="relative">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or Cloudinary URL"
              value={manualUrl}
              onChange={handleManualUrlChange}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Paste an existing public image URL or switch to "Drop / Upload File" to serve directly from Cloudinary.
          </p>
        </div>
      ) : (
        /* Drag & Drop File Upload Tab */
        <div>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
          />

          {!value ? (
            /* Dropzone Box when no image is selected yet */
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center py-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Uploading image to Cloudinary...
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Optimizing dimensions and serving on the cloud
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 mb-1">
                    {isDragging ? 'Drop your image file here' : 'Drop your image file here, or click to browse'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports JPG, PNG, WEBP, GIF, SVG up to 10MB
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    <Cloud className="w-3 h-3 text-blue-600" />
                    Served on Cloudinary Cloud Storage
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Uploaded Image Preview & Controls */
            <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-2xs space-y-3">
              <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                <img
                  src={value}
                  alt="Uploaded Cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Cloudinary Badge Overlay */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {isCloudinaryUrl ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-sm">
                      <Cloud className="w-3 h-3" /> Cloudinary CDN
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-slate-800/80 text-slate-200 backdrop-blur-xs flex items-center gap-1 shadow-sm">
                      <ImageIcon className="w-3 h-3" /> Image Loaded
                    </span>
                  )}
                </div>

                {/* Top Right Quick Actions */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg shadow-sm transition"
                    title="Open full size image in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 bg-white/90 hover:bg-white text-rose-600 hover:text-rose-700 rounded-lg shadow-sm transition cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Uploaded File Details & Replace Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 truncate">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-slate-700">{value}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                    <span>Upload New</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {uploadSuccessInfo?.message && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  {uploadSuccessInfo.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
