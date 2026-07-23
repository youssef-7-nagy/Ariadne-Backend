const Category = require('../models/Category');
const Project = require('../models/Project');
const { processMedia, processCoverImage } = require('../services/media.service');

// =======================
// CATEGORIES
// =======================

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    // req.file.path is the full OS path on local disk; we need the URL-friendly path.
    // If using Cloudinary, path is already a full https:// URL. If using local disk,
    // path is an OS filepath — convert it to a relative /uploads/... URL.
    const fileToUrl = (file) => {
      if (!file) return undefined;
      if (file.path.startsWith('http')) return file.path; // Cloudinary URL
      return `/uploads/${file.filename}`;                  // local disk -> relative URL
    };
    const coverImage = fileToUrl(req.file);
    const category = new Category({ name, slug, description, ...(coverImage && { coverImage }) });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const update = { name, slug, description };
    if (req.file) {
      update.coverImage = req.file.path.startsWith('http')
        ? req.file.path                     // Cloudinary URL
        : `/uploads/${req.file.filename}`;  // local disk -> relative URL
    }
    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const { reorderedItems } = req.body;
    const bulkOps = reorderedItems.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order }
      }
    }));
    await Category.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// PROJECTS
// =======================

exports.getProjects = async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 100, search } = req.query;
    
    let filter = {};
    if (categoryId) filter.category = categoryId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(filter)
      .sort({ order: 1, date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: 'category',
        select: 'name'
      });
      
    const total = await Project.countDocuments(filter);

    res.json({ 
      success: true, 
      data: projects,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, slug, categoryId, description, date, clientName, tags, externalLink, mediaType } = req.body;

    // ── Diagnostic logging (visible in Hostinger Node.js logs) ──────────────
    console.log(`[createProject] Received files:`, JSON.stringify(
      req.files ? Object.fromEntries(Object.entries(req.files).map(([k, v]) => [
        k, v.map(f => ({ name: f.originalname, size: f.size, mime: f.mimetype, path: f.path, filename: f.filename }))
      ])) : null
    ));
    console.log(`[createProject] Body fields: title=${title}, slug=${slug}, categoryId=${categoryId}`);
    // ────────────────────────────────────────────────────────────────────────

    const media = processMedia(req.files, req.body);
    const coverImage = processCoverImage(req.files);

    console.log(`[createProject] Resolved coverImage URL: ${coverImage || 'none'}`);
    console.log(`[createProject] Resolved media:`, JSON.stringify(media));

    const project = new Project({
      title, slug,
      category: categoryId,
      description, date,
      clientName,
      externalLink,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      media,
      ...(coverImage && { coverImage })
    });
    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, slug, categoryId, description, date, clientName, tags, externalLink, mediaType } = req.body;

    // ── Diagnostic logging ──────────────────────────────────────────────────
    console.log(`[updateProject] id=${req.params.id} | files:`, JSON.stringify(
      req.files ? Object.fromEntries(Object.entries(req.files).map(([k, v]) => [
        k, v.map(f => ({ name: f.originalname, size: f.size, path: f.path, filename: f.filename }))
      ])) : null
    ));
    // ────────────────────────────────────────────────────────────────────────

    const update = {
      title, slug,
      category: categoryId,
      description, date,
      clientName,
      externalLink,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (req.files && (req.files['media'] || req.files['videoThumbnail']) || req.body.embedUrl) {
      const newMedia = processMedia(req.files, req.body);
      if (newMedia.length > 0) {
        update.media = newMedia;
      } else if (req.files && req.files['videoThumbnail']) {
        const thumbFile = req.files['videoThumbnail'][0];
        update['media.0.thumbnailUrl'] = thumbFile.path.match(/^https?:\/\//) ? thumbFile.path : `/uploads/${thumbFile.filename}`;
      }
    }
    
    const coverImage = processCoverImage(req.files);
    if (coverImage) {
      update.coverImage = coverImage;
    }

    const project = await Project.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reorderProjects = async (req, res) => {
  try {
    const { reorderedItems } = req.body;
    const bulkOps = reorderedItems.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order }
      }
    }));
    await Project.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Projects reordered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
