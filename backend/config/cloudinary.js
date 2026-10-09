require('dotenv').config();
const cloudinary = require('cloudinary').v2;

/**
 * Configure and return Cloudinary instance with trimmed credentials
 */
const configureCloudinary = () => {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = (process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true
  });

  return { cloud_name, api_key, api_secret };
};

// Initial config
configureCloudinary();

/**
 * Check if Cloudinary is properly configured with credentials
 */
const isCloudinaryConfigured = () => {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = (process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  return Boolean(
    cloud_name &&
    api_key &&
    api_secret &&
    !cloud_name.includes('your_') &&
    !api_key.includes('your_')
  );
};

/**
 * Upload a file buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from Multer
 * @param {Object} options - Upload options (folder, tags, transformations)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Re-verify and ensure latest credentials are bound to Cloudinary instance
    const { cloud_name } = configureCloudinary();

    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env'
        )
      );
    }

    const uploadOptions = {
      folder: 'utsanova_blogs',
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' } // Automatic format & compression optimization
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  configureCloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary
};
