const { optimizeCoverImage } = require('./imageOptimizer');

const processMedia = async (files, body) => {
  const media = [];
  
  if (files && files['media']) {
    const mainFile = files['media'][0];
    let mainUrl = `/uploads/${mainFile.filename}`;

    // If main uploaded file is an image, optimize it via Sharp to WebP
    if (mainFile.mimetype.startsWith('image/')) {
      console.log(`[MediaService] Optimizing main image file: ${mainFile.originalname}`);
      mainUrl = await optimizeCoverImage(mainFile.filename);
    }

    let thumbnailUrl = undefined;
    if (files['videoThumbnail']) {
      const thumbFile = files['videoThumbnail'][0];
      console.log(`[MediaService] Optimizing video thumbnail: ${thumbFile.originalname}`);
      thumbnailUrl = await optimizeCoverImage(thumbFile.filename);
    }

    const type = body.mediaType || (mainFile.mimetype.startsWith('video/') ? 'video' : 'image');

    console.log(`[MediaService] Processed uploaded file: ${mainFile.originalname} as ${type} -> URL: ${mainUrl}`);

    media.push({
      type: type,
      url: mainUrl,
      public_id: mainFile.filename,
      resource_type: mainFile.mimetype.startsWith('video/') ? 'video' : 'image',
      ...(thumbnailUrl && { thumbnailUrl }),
      isFeatured: true,
      order: 0
    });
  } else if (body.embedUrl) {
    let finalEmbedUrl = body.embedUrl;
    
    // Extract src from iframe string if provided
    const srcMatch = finalEmbedUrl.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      finalEmbedUrl = srcMatch[1];
    }
    
    console.log(`[MediaService] Processing embed URL: ${finalEmbedUrl}`);
    
    let thumbnailUrl = undefined;
    if (files && files['videoThumbnail']) {
      const thumbFile = files['videoThumbnail'][0];
      console.log(`[MediaService] Optimizing video thumbnail for embed: ${thumbFile.originalname}`);
      thumbnailUrl = await optimizeCoverImage(thumbFile.filename);
    }
    
    media.push({
      type: 'embed',
      url: finalEmbedUrl,
      ...(thumbnailUrl && { thumbnailUrl }),
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
