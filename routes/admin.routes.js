const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const adminController = require('../controllers/admin.controller');
const { authMiddleWare } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/admin.middleware');

// Apply auth and admin check to all routes
router.use(authMiddleWare);
router.use(adminOnly);

const upload = require('../services/upload.service');

// Categories
router.get('/categories', adminController.getCategories);
router.post('/categories', upload.single('coverImage'), adminController.createCategory);
router.put('/categories/reorder', adminController.reorderCategories); // before /:id
router.put('/categories/:id', upload.single('coverImage'), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Projects
router.get('/projects', adminController.getProjects);
router.post('/projects', upload.fields([{ name: 'media', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }, { name: 'videoThumbnail', maxCount: 1 }]), adminController.createProject);
router.put('/projects/reorder', adminController.reorderProjects); // before /:id
router.put('/projects/:id', upload.fields([{ name: 'media', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }, { name: 'videoThumbnail', maxCount: 1 }]), adminController.updateProject);
router.delete('/projects/:id', adminController.deleteProject);

// Multer error handler – must have 4 params to be treated as an Express error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum allowed size is 3 GB.`
    });
  }
  if (err.message === 'Only images and videos are allowed') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;
