const Category = require('../models/Category');
const Project = require('../models/Project');
const { User } = require('../models/User');
const { processMedia, processCoverImage } = require('../services/media.service');

// =======================
// CATEGORIES
// =======================

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { optimizeCoverImage } = require('../services/imageOptimizer');

exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive } = req.body;
    let coverImage = undefined;
    if (req.file) {
      coverImage = await optimizeCoverImage(req.file.filename);
    }
    const category = new Category({ 
      name, slug, description, 
      ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
      ...(coverImage && { coverImage }) 
    });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, slug, description, isActive } = req.body;
    const update = { name, slug, description };
    if (isActive !== undefined) {
      update.isActive = isActive === 'true' || isActive === true;
    }
    if (req.file) {
      update.coverImage = await optimizeCoverImage(req.file.filename);
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

    const limitNum = parseInt(limit, 10) || 100;
    const pageNum = parseInt(page, 10) || 1;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ order: 1, date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate({
          path: 'category',
          select: 'name'
        })
        .populate({
          path: 'clientId',
          select: 'name email avatar'
        })
        .lean(),
      Project.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    let { title, slug, categoryId, description, date, clientName, clientId, tags, externalLink, youtubeUrl, mediaType, isPortrait, isHidden, galleryStructure } = req.body;

    // Resolve clientId if not explicitly provided but clientName matches an existing user
    if (!clientId && clientName && clientName.trim()) {
      const matchedUser = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') } },
          { email: clientName.trim().toLowerCase() }
        ]
      }).select('_id name');
      if (matchedUser) {
        clientId = matchedUser._id;
      }
    }

    // ── Mandatory cover image validation ──
    if (!req.files || !req.files['coverImage'] || req.files['coverImage'].length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cover image is required. Please upload a cover photo for this project.'
      });
    }

    const coverImage = await processCoverImage(req.files);

    let media;
    if (mediaType === 'gallery' && galleryStructure) {
      const parsedStructure = typeof galleryStructure === 'string' ? JSON.parse(galleryStructure) : galleryStructure;
      const galleryFiles = req.files && req.files['media'] ? req.files['media'] : [];
      const optimizedFiles = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const f = galleryFiles[i];
        console.log(`[createProject] Optimizing gallery image ${i + 1}/${galleryFiles.length}: ${f.originalname}`);
        const optimizedUrl = await optimizeCoverImage(f.filename);
        optimizedFiles.push({
          type: 'image',
          url: optimizedUrl,
          public_id: f.filename,
          resource_type: 'image'
        });
      }

      media = parsedStructure.map((item, idx) => {
        const fileIdx = item.index ?? item.newFileIndex;
        const opt = optimizedFiles[fileIdx];
        if (!opt) return null;
        return {
          type: 'image',
          url: opt.url,
          public_id: opt.public_id,
          resource_type: 'image',
          isFeatured: idx === 0,
          order: idx
        };
      }).filter(Boolean);
    } else {
      media = await processMedia(req.files, req.body, coverImage);
    }

    console.log(`[createProject] Cover image optimized: ${coverImage}`);

    // Calculate order scoped to category
    const lastProj = await Project.findOne({ category: categoryId }).sort({ order: -1 }).select('order').lean();
    const order = (lastProj && typeof lastProj.order === 'number') ? lastProj.order + 1 : 0;

    const isHiddenBool = isHidden === 'true' || isHidden === true;

    const project = new Project({
      title, slug,
      category: categoryId,
      description, date,
      clientName,
      clientId: clientId || undefined,
      externalLink,
      youtubeUrl: youtubeUrl || '',
      mediaType: mediaType || 'video',
      isPortrait: isPortrait === 'true' || isPortrait === true,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      media,
      coverImage,
      order,
      isHidden: isHiddenBool,
      isPublished: !isHiddenBool
    });
    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, slug, categoryId, description, date, clientName, clientId, tags, externalLink, youtubeUrl, mediaType, isPortrait, isHidden, isPublished, galleryStructure } = req.body;

    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) return res.status(404).json({ success: false, message: 'Project not found' });

    const update = {
      title, slug,
      category: categoryId,
      description, date,
      clientName,
      externalLink,
      youtubeUrl: youtubeUrl || '',
      mediaType: mediaType || existingProject.mediaType || 'video',
      isPortrait: isPortrait === 'true' || isPortrait === true,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (clientId !== undefined) {
      update.clientId = clientId || null;
    } else if (clientName && clientName.trim() && clientName !== existingProject.clientName) {
      const matchedUser = await User.findOne({
        name: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') }
      }).select('_id');
      if (matchedUser) {
        update.clientId = matchedUser._id;
      }
    }

    if (isHidden !== undefined) {
      const isHiddenBool = isHidden === 'true' || isHidden === true;
      update.isHidden = isHiddenBool;
      update.isPublished = !isHiddenBool;
    } else if (isPublished !== undefined) {
      const isPubBool = isPublished === 'true' || isPublished === true;
      update.isPublished = isPubBool;
      update.isHidden = !isPubBool;
    }

    // If category changed, assign next available order in the new category
    if (categoryId && existingProject.category && existingProject.category.toString() !== categoryId.toString()) {
      const lastProj = await Project.findOne({ category: categoryId }).sort({ order: -1 }).select('order').lean();
      update.order = (lastProj && typeof lastProj.order === 'number') ? lastProj.order + 1 : 0;
    }

    const coverImage = await processCoverImage(req.files);
    if (coverImage) {
      update.coverImage = coverImage;
    }

    const effectiveCover = coverImage || existingProject.coverImage;

    // Gallery project update with explicit galleryStructure
    if ((update.mediaType === 'gallery') && galleryStructure !== undefined) {
      const parsedStructure = typeof galleryStructure === 'string' ? JSON.parse(galleryStructure) : galleryStructure;
      const galleryFiles = req.files && req.files['media'] ? req.files['media'] : [];

      // Optimize newly uploaded gallery images
      const optimizedNewFiles = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const f = galleryFiles[i];
        console.log(`[updateProject] Optimizing new gallery image ${i + 1}/${galleryFiles.length}: ${f.originalname}`);
        const optimizedUrl = await optimizeCoverImage(f.filename);
        optimizedNewFiles.push({
          type: 'image',
          url: optimizedUrl,
          public_id: f.filename,
          resource_type: 'image'
        });
      }

      // Map existing media by _id and url
      const existingMediaMap = new Map();
      (existingProject.media || []).forEach(m => {
        if (m._id) existingMediaMap.set(m._id.toString(), m);
        if (m.url) existingMediaMap.set(m.url, m);
      });

      const finalMedia = [];
      for (let i = 0; i < parsedStructure.length; i++) {
        const item = parsedStructure[i];
        if (item.type === 'existing') {
          const match = (item.id && existingMediaMap.get(item.id.toString())) || (item.url && existingMediaMap.get(item.url));
          if (match) {
            const mObj = match.toObject ? match.toObject() : { ...match };
            mObj.order = i;
            mObj.isFeatured = (i === 0);
            finalMedia.push(mObj);
          }
        } else if (item.type === 'new') {
          const fileIdx = item.index ?? item.newFileIndex;
          if (optimizedNewFiles[fileIdx]) {
            finalMedia.push({
              type: 'image',
              url: optimizedNewFiles[fileIdx].url,
              public_id: optimizedNewFiles[fileIdx].public_id,
              resource_type: 'image',
              isFeatured: (i === 0),
              order: i
            });
          }
        }
      }
      update.media = finalMedia;
    } else {
      // Non-gallery or fallback logic (e.g. video / trailer / embed)
      if (req.files && (req.files['media'] || req.files['videoThumbnail']) || req.body.embedUrl) {
        const newMedia = await processMedia(req.files, req.body, effectiveCover);
        if (newMedia.length > 0) {
          update.media = newMedia;
        } else if (req.files && req.files['videoThumbnail']) {
          const thumbFile = req.files['videoThumbnail'][0];
          const thumbUrl = await optimizeCoverImage(thumbFile.filename);
          if (existingProject.media && existingProject.media.length > 0) {
            existingProject.media[0].thumbnailUrl = thumbUrl;
            update.media = existingProject.media;
          }
        }
      }
    }

    const project = await Project.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
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

exports.toggleProjectVisibility = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    let newIsHidden;
    if (req.body.isHidden !== undefined) {
      newIsHidden = req.body.isHidden === true || req.body.isHidden === 'true';
    } else if (req.body.isPublished !== undefined) {
      newIsHidden = !(req.body.isPublished === true || req.body.isPublished === 'true');
    } else {
      newIsHidden = !project.isHidden;
    }

    project.isHidden = newIsHidden;
    project.isPublished = !newIsHidden;
    await project.save();

    res.json({ success: true, data: project });
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
