const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolio.controller');

router.get('/categories', portfolioController.getCategories);
router.get('/client/:clientName', portfolioController.getProjectsByClient);
router.get('/projects/:categorySlug', portfolioController.getProjectsByCategory);
router.get('/project/:projectSlug', portfolioController.getProjectBySlug);

module.exports = router;
