/**
 * Client-side Image Compression Utility
 * Compresses images before network upload using HTML5 Canvas:
 * - Downscales large resolutions (max width/height limit)
 * - Compresses quality using WebP / JPEG
 * - Preserves aspect ratio
 * - Bypasses SVGs and animated GIFs to retain vector / animation data
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.82,
    outputType = 'image/webp'
  } = options;

  // If not a regular raster image (e.g. SVG or already tiny file < 50KB), return as-is
  if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      file,
      originalSize: file?.size || 0,
      compressedSize: file?.size || 0,
      ratio: 0
    };
  }

  const originalSize = file.size;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale down
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const scale = Math.min(widthRatio, heightRatio);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ file, originalSize, compressedSize: originalSize, ratio: 0 });
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Determine best target mime type
        const targetType = outputType && canvas.toDataURL(outputType).startsWith(`data:${outputType}`)
          ? outputType
          : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= originalSize) {
              // If compressed blob is somehow larger than original, keep original
              return resolve({ file, originalSize, compressedSize: originalSize, ratio: 0 });
            }

            const extension = targetType === 'image/webp' ? '.webp' : '.jpg';
            const newFileName = file.name.replace(/\.[^/.]+$/, '') + extension;
            const compressedFile = new File([blob], newFileName, {
              type: targetType,
              lastModified: Date.now()
            });

            const ratio = Math.round(((originalSize - blob.size) / originalSize) * 100);

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize: blob.size,
              ratio
            });
          },
          targetType,
          quality
        );
      };

      img.onerror = () => {
        resolve({ file, originalSize, compressedSize: originalSize, ratio: 0 });
      };
    };

    reader.onerror = () => {
      resolve({ file, originalSize, compressedSize: originalSize, ratio: 0 });
    };
  });
}

/**
 * Format bytes to readable string (e.g. 2.4 MB, 350 KB)
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
