const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

/**
 * Optimizes an uploaded image for Maximum 8K Ultra-HD Photography Display:
 * - Supports full 8K Ultra-HD resolution (7680px max width / 4320px max height)
 * - Retains 100% maximum sharpness and full 4:4:4 color precision (quality: 100)
 * - Disables input pixel limits to process massive 8K+ camera exports smoothly
 * - Saves as `opt_<original-name>.webp` alongside the original
 * - Falls back to raw original high-res file if processing error occurs
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
    // Ultra High Quality 8K Sharp pipeline
    await sharp(inputPath, { limitInputPixels: false })
      .resize({
        width: 7680,
        height: 4320,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 100,
        effort: 6,
        smartSubsample: false, // Preserves 4:4:4 full color fidelity
        reductionEffort: 6
      })
      .toFile(outputPath);

    const originalStats = fs.statSync(inputPath);
    const optimizedStats = fs.statSync(outputPath);

    console.log(
      `[ImageOptimizer] 8K Ultra-HD Processed: ${originalFilename} (${(originalStats.size / 1024).toFixed(0)}KB)` +
      ` → ${optimizedFilename} (${(optimizedStats.size / 1024).toFixed(0)}KB) @ 8K Quality 100`
    );

    return `/uploads/${optimizedFilename}`;
  } catch (err) {
    console.error(`[ImageOptimizer] Warning: Could not process ${originalFilename}, falling back to 8K raw original: ${err.message}`);
    // Fallback directly to raw original image file
    return `/uploads/${originalFilename}`;
  }
};

module.exports = { optimizeCoverImage };

