const Category = require('../models/Category');
const Project = require('../models/Project');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const category = await Category.findOne({ slug: categorySlug, isActive: true }).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const limitNum = parseInt(limit, 10) || 10;
    const pageNum = parseInt(page, 10) || 1;

    const [projects, total] = await Promise.all([
      Project.find({ category: category._id, isPublished: true })
        .sort({ date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Project.countDocuments({ category: category._id, isPublished: true })
    ]);

    res.json({ 
      success: true, 
      data: projects,
      category,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectBySlug = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const project = await Project.findOne({ slug: projectSlug, isPublished: true })
      .populate('category', 'name slug')
      .lean();
    
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
      .populate('category', 'name slug')
      .lean();

    res.json({ success: true, data: projects, clientName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

