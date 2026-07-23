const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

/**
 * Optimizes an uploaded image:
 * - Resizes to max 1200px width (preserving aspect ratio)
 * - Converts to WebP at quality 80
 * - Saves as `opt_<original-name>.webp` alongside the original
 * - Returns the URL path to the optimized image
 *
 * If optimization fails (e.g., unsupported format), falls back to the original.
 */
const optimizeCoverImage = async (originalFilename) => {
  if (!originalFilename) return null;

  const inputPath = path.join(UPLOAD_DIR, originalFilename);

  // Only optimize image files, skip videos
  const imageExts = /\.(jpe?g|png|gif|webp|avif|heic|tiff?)$/i;
  if (!imageExts.test(originalFilename)) {
    console.log(`[ImageOptimizer] Skipping non-image file: ${originalFilename}`);
    return `/uploads/${originalFilename}`;
  }

  // Generate optimized filename
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const optimizedFilename = `opt_${baseName}.webp`;
  const outputPath = path.join(UPLOAD_DIR, optimizedFilename);

  try {
    await sharp(inputPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const originalStats = fs.statSync(inputPath);
    const optimizedStats = fs.statSync(outputPath);
    const savedPercent = Math.round((1 - optimizedStats.size / originalStats.size) * 100);

    console.log(
      `[ImageOptimizer] Optimized: ${originalFilename} (${(originalStats.size / 1024).toFixed(0)}KB)` +
      ` → ${optimizedFilename} (${(optimizedStats.size / 1024).toFixed(0)}KB) — ${savedPercent}% smaller`
    );

    return `/uploads/${optimizedFilename}`;
  } catch (err) {
    console.error(`[ImageOptimizer] Failed to optimize ${originalFilename}: ${err.message}`);
    // Fallback to original
    return `/uploads/${originalFilename}`;
  }
};

module.exports = { optimizeCoverImage };
