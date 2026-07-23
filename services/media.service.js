const processMedia = (files, body) => {
  const media = [];
  
  if (files && files['media']) {
    const mainFile = files['media'][0];
    const mainUrl = `/uploads/${mainFile.filename}`;
    
    let thumbnailUrl = undefined;
    if (files['videoThumbnail']) {
      const thumbFile = files['videoThumbnail'][0];
      thumbnailUrl = `/uploads/${thumbFile.filename}`;
    }

    const type = body.mediaType || (mainFile.mimetype.startsWith('video/') ? 'video' : 'image');

    console.log(`[MediaService] Processing uploaded file: ${mainFile.originalname} as ${type}`);

    media.push({
      type: type,
      url: mainUrl,
      public_id: mainFile.filename, // Keep track of the filename for future reference/deletion
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
      thumbnailUrl = `/uploads/${thumbFile.filename}`;
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

const processCoverImage = (files) => {
  if (files && files['coverImage']) {
    const coverFile = files['coverImage'][0];
    const url = `/uploads/${coverFile.filename}`;
    console.log(`[MediaService] Processing cover image: ${url}`);
    return url;
  }
  return undefined;
};

module.exports = {
  processMedia,
  processCoverImage
};

