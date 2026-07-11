const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isConfigured } = require('./cloudinary.service');

let storage;

if (isConfigured) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let resource_type = 'auto';
      if (file.mimetype.startsWith('video/')) {
          resource_type = 'video';
      } else if (file.mimetype.startsWith('image/')) {
          resource_type = 'image';
      }
      return {
        folder: 'ariadne_portfolio',
        resource_type: resource_type,
      };
    },
  });
  console.log('✅ Multer configured with CloudinaryStorage.');
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    }
  });
  console.log('⚠️ Multer configured with Local diskStorage.');
}

const uploadService = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }, // 3 GB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mkv|m4v|hevc/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    allowed.test(ext) ? cb(null, true) : cb(new Error('Only images and videos are allowed'));
  }
});

module.exports = uploadService;
