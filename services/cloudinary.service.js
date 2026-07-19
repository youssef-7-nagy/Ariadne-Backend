const cloudinary = require('cloudinary').v2;

const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('[OK] Cloudinary initialized with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('[WARN] Cloudinary keys missing. Will fallback to local upload storage.');
}

const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      // Remove version if present
      let path = parts[1].replace(/^v\d+\//, '');
      // Remove extension
      return path.split('.')[0];
    }
  } catch (e) {
    console.error('Error extracting Cloudinary public ID:', e.message);
  }
  return null;
};

module.exports = {
  cloudinary,
  isConfigured,
  extractCloudinaryPublicId
};
