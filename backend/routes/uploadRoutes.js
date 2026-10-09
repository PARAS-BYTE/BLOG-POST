const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { uploadBufferToCloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const router = express.Router();

// Configure Multer with in-memory storage (buffers)
const storage = multer.memoryStorage();

// Validate image file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, and SVG images are permitted.'),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size
  }
});

/**
 * @route   GET /api/upload/status
 * @desc    Check whether Cloudinary is configured
 * @access  Private (Admins / SuperAdmin)
 */
router.get('/status', protect, (req, res) => {
  return res.json({
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing'
  });
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload an image file directly to Cloudinary
 * @access  Private (Admins / SuperAdmin)
 */
router.post('/image', protect, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    // Handle Multer upload errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image exceeds maximum size limit (10MB).'
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please drop or select an image file.'
      });
    }

    try {
      // Check if Cloudinary is configured
      if (!isCloudinaryConfigured()) {
        // Fallback for development if keys are not yet provided:
        // Convert to data URI so uploading still works without breaking the UI,
        // and return a clear instruction.
        const base64Data = req.file.buffer.toString('base64');
        const fallbackDataUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        
        return res.json({
          success: true,
          url: fallbackDataUrl,
          isFallback: true,
          message: 'Cloudinary credentials not set in backend/.env. Using inline image data fallback. Configure CLOUDINARY_CLOUD_NAME to serve on Cloudinary CDN.'
        });
      }

      // Upload buffer directly to Cloudinary
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'utsanova_blogs',
        tags: ['utsanova', 'blog_cover', req.user?.email || 'admin']
      });

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        message: 'Image uploaded to Cloudinary successfully!'
      });
    } catch (uploadErr) {
      console.error('Cloudinary upload error:', uploadErr);
      return res.status(500).json({
        success: false,
        message: uploadErr.message || 'Failed to upload image to Cloudinary.'
      });
    }
  });
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple image files (up to 10) directly to Cloudinary
 * @access  Private (Admins / SuperAdmin)
 */
router.post('/images', protect, (req, res) => {
  upload.array('images', 10)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more images exceed the maximum size limit (10MB).'
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided.'
      });
    }

    try {
      const isConfigured = isCloudinaryConfigured();
      const uploadedImages = [];

      for (const file of req.files) {
        if (!isConfigured) {
          const base64Data = file.buffer.toString('base64');
          const fallbackDataUrl = `data:${file.mimetype};base64,${base64Data}`;
          uploadedImages.push({
            url: fallbackDataUrl,
            isFallback: true,
            bytes: file.size
          });
        } else {
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder: 'utsanova_blogs',
            tags: ['utsanova', 'blog_gallery', req.user?.email || 'admin']
          });
          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height
          });
        }
      }

      const urls = uploadedImages.map((img) => img.url);

      return res.status(200).json({
        success: true,
        urls,
        images: uploadedImages,
        message: `${uploadedImages.length} images uploaded successfully!`
      });
    } catch (uploadErr) {
      console.error('Batch image upload error:', uploadErr);
      return res.status(500).json({
        success: false,
        message: uploadErr.message || 'Failed to upload images.'
      });
    }
  });
});

module.exports = router;
