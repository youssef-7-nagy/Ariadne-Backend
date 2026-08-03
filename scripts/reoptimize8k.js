const fs = require('fs');
const path = require('path');
const { optimizeCoverImage } = require('../services/imageOptimizer');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

async function reoptimizeAll() {
  console.log('[Reoptimizer] Starting 8K Ultra-HD re-optimization for all existing uploaded photos...');
  const files = fs.readdirSync(UPLOAD_DIR);

  const rawImageFiles = files.filter(file => {
    // Only target raw original files (skip opt_... files and non-images)
    if (file.startsWith('opt_')) return false;
    return /\.(jpe?g|png|gif|webp|avif|heic|tiff?)$/i.test(file);
  });

  console.log(`[Reoptimizer] Found ${rawImageFiles.length} raw image files to process for 8K resolution.`);

  let count = 0;
  for (const file of rawImageFiles) {
    count++;
    console.log(`[Reoptimizer] (${count}/${rawImageFiles.length}) Processing 8K: ${file}`);
    try {
      await optimizeCoverImage(file);
    } catch (err) {
      console.error(`[Reoptimizer] Error processing ${file}:`, err);
    }
  }

  console.log('[Reoptimizer] Successfully re-optimized all existing images to 8K Ultra-HD resolution!');
}

reoptimizeAll();
