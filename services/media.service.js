const { optimizeCoverImage } = require('./imageOptimizer');

const processMedia = async (files, body) => {
  const media = [];

  let mainImageOptUrl = undefined;
  let videoThumbOptUrl = undefined;

  // Process video thumbnail if uploaded
  if (files && files['videoThumbnail']) {
    const thumbFile = files['videoThumbnail'][0];
    console.log(`[MediaService] Optimizing video thumbnail: ${thumbFile.originalname}`);
    videoThumbOptUrl = await optimizeCoverImage(thumbFile.filename);
  }

  // Process main uploaded file if provided
  const mainFile = files && files['media'] ? files['media'][0] : null;
  let mainUrl = undefined;
  if (mainFile) {
    mainUrl = `/uploads/${mainFile.filename}`;
    if (mainFile.mimetype.startsWith('image/')) {
      console.log(`[MediaService] Optimizing main image file: ${mainFile.originalname}`);
      mainImageOptUrl = await optimizeCoverImage(mainFile.filename);
      mainUrl = mainImageOptUrl;
    }
  }

  // 1. If embed URL is provided (Bunny.net, YouTube, etc.)
  if (body.embedUrl && body.embedUrl.trim()) {
    let finalEmbedUrl = body.embedUrl.trim();
    const srcMatch = finalEmbedUrl.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      finalEmbedUrl = srcMatch[1];
    }

    console.log(`[MediaService] Processing embed URL: ${finalEmbedUrl}`);

    // Poster priority for embed: explicit videoThumbnail -> main uploaded image
    const posterUrl = videoThumbOptUrl || mainImageOptUrl;

    media.push({
      type: 'embed',
      url: finalEmbedUrl,
      ...(posterUrl && { thumbnailUrl: posterUrl }),
      isFeatured: true,
      order: 0
    });

    // If main image was also uploaded, add it as a secondary gallery image item
    if (mainImageOptUrl) {
      media.push({
        type: 'image',
        url: mainImageOptUrl,
        public_id: mainFile ? mainFile.filename : '',
        resource_type: 'image',
        isFeatured: false,
        order: 1
      });
    }
  }
  // 2. Otherwise if main file was uploaded (image or video)
  else if (mainFile) {
    const type = body.mediaType || (mainFile.mimetype.startsWith('video/') ? 'video' : 'image');
    console.log(`[MediaService] Processed uploaded file: ${mainFile.originalname} as ${type} -> URL: ${mainUrl}`);

    const posterUrl = videoThumbOptUrl;

    media.push({
      type: type,
      url: mainUrl,
      public_id: mainFile.filename,
      resource_type: mainFile.mimetype.startsWith('video/') ? 'video' : 'image',
      ...(posterUrl && { thumbnailUrl: posterUrl }),
      isFeatured: true,
      order: 0
    });
  }

  return media;
};

/**
 * Processes cover image — optimizes to WebP via Sharp.
 * Returns the optimized URL path (e.g., `/uploads/opt_1234.webp`).
 */
const processCoverImage = async (files) => {
  if (files && files['coverImage']) {
    const coverFile = files['coverImage'][0];
    console.log(`[MediaService] Processing cover image: ${coverFile.originalname}`);
    const optimizedUrl = await optimizeCoverImage(coverFile.filename);
    console.log(`[MediaService] Optimized cover image URL: ${optimizedUrl}`);
    return optimizedUrl;
  }
  return undefined;
};

module.exports = {
  processMedia,
  processCoverImage
};
