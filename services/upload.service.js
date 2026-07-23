const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
console.log('[OK] Multer configured with Local diskStorage.');

const uploadService = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }, // 3 GB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|avif|heic|mp4|mov|avi|webm|mkv|m4v|hevc/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      console.warn(`[UploadService] Rejected file with unsupported extension: .${ext} (${file.originalname})`);
      cb(new Error(`Only images and videos are allowed (received .${ext})`));
    }
  }
});

module.exports = uploadService;

