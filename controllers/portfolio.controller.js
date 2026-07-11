const Category = require('../models/Category');
const Project = require('../models/Project');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const category = await Category.findOne({ slug: categorySlug, isActive: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const projects = await Project.find({ category: category._id, isPublished: true })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
    const total = await Project.countDocuments({ category: category._id, isPublished: true });

    res.json({ 
      success: true, 
      data: projects,
      category,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectBySlug = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const project = await Project.findOne({ slug: projectSlug, isPublished: true }).populate('category', 'name slug');
    
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectsByClient = async (req, res) => {
  try {
    const clientName = decodeURIComponent(req.params.clientName);
    const projects = await Project.find({
      clientName: { $regex: new RegExp(`^${clientName}$`, 'i') },
      isPublished: true
    })
      .sort({ date: -1 })
      .populate('category', 'name slug');

    res.json({ success: true, data: projects, clientName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

