const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

/**
 * Optimizes an uploaded image for Ultra-High Quality photography display:
 * - Supports up to 4K Ultra-HD resolution (3840px max width/height)
 * - Retains maximum sharpness and color fidelity (quality: 98, smartSubsample: true)
 * - Saves as `opt_<original-name>.webp` alongside the original
 * - Falls back to the raw high-res original if any processing error occurs
 */
const optimizeCoverImage = async (originalFilename) => {
  if (!originalFilename) return null;

  const inputPath = path.join(UPLOAD_DIR, originalFilename);

  // Only optimize image files, skip videos
  const imageExts = /\.(jpe?g|png|gif|webp|avif|heic|tiff?)$/i;
  if (!imageExts.test(originalFilename)) {
    console.log(`[ImageOptimizer] Non-image file, preserving raw original: ${originalFilename}`);
    return `/uploads/${originalFilename}`;
  }

  // Generate optimized filename
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const optimizedFilename = `opt_${baseName}.webp`;
  const outputPath = path.join(UPLOAD_DIR, optimizedFilename);

  try {
    // Ultra High Quality 4K Sharp pipeline
    await sharp(inputPath)
      .resize({
        width: 3840,
        height: 2160,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 98,
        effort: 6,
        smartSubsample: true,
        reductionEffort: 6
      })
      .toFile(outputPath);

    const originalStats = fs.statSync(inputPath);
    const optimizedStats = fs.statSync(outputPath);

    console.log(
      `[ImageOptimizer] 4K Ultra-HD Processed: ${originalFilename} (${(originalStats.size / 1024).toFixed(0)}KB)` +
      ` → ${optimizedFilename} (${(optimizedStats.size / 1024).toFixed(0)}KB) @ Quality 98`
    );

    return `/uploads/${optimizedFilename}`;
  } catch (err) {
    console.error(`[ImageOptimizer] Warning: Could not process ${originalFilename}, falling back to high-res raw original: ${err.message}`);
    // Fallback directly to raw original image file
    return `/uploads/${originalFilename}`;
  }
};

module.exports = { optimizeCoverImage };
