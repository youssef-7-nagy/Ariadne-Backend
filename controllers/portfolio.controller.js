const mongoose = require('mongoose');
const Category = require('../models/Category');
const Project = require('../models/Project');
const { User } = require('../models/User');

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

    const queryFilter = {
      category: category._id,
      isPublished: { $ne: false },
      isHidden: { $ne: true }
    };

    const [projects, total] = await Promise.all([
      Project.find(queryFilter)
        .sort({ order: 1, date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Project.countDocuments(queryFilter)
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
    const project = await Project.findOne({
      slug: projectSlug,
      isPublished: { $ne: false },
      isHidden: { $ne: true }
    })
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
    const rawClientParam = decodeURIComponent(req.params.clientName).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(rawClientParam);

    let matchedUserId = isObjectId ? rawClientParam : null;
    let displayName = rawClientParam;

    if (!matchedUserId) {
      const user = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${rawClientParam}$`, 'i') } },
          { email: rawClientParam.toLowerCase() }
        ]
      }).select('_id name').lean();

      if (user) {
        matchedUserId = user._id;
        displayName = user.name;
      }
    } else {
      const user = await User.findById(matchedUserId).select('name').lean();
      if (user) displayName = user.name;
    }

    const orFilters = [
      { clientName: { $regex: new RegExp(`^${displayName}$`, 'i') } }
    ];
    if (matchedUserId) {
      orFilters.push({ clientId: matchedUserId });
    }

    const projects = await Project.find({
      $or: orFilters,
      isPublished: { $ne: false },
      isHidden: { $ne: true }
    })
      .sort({ order: 1, date: -1 })
      .populate('category', 'name slug')
      .populate('clientId', 'name email avatar')
      .lean();

    res.json({ success: true, data: projects, clientName: displayName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

