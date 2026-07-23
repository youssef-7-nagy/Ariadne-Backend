const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true,
    index: true
  },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  clientName: { type: String },
  tags: [{ type: String, index: true }],
  externalLink: { type: String }, // YouTube or any external URL
  coverImage: { type: String, required: [true, 'Cover image is required'] },
  
  media: [{ 
    type: { type: String, enum: ['image', 'video', 'embed'], required: true },
    url: { type: String, required: true }, // secure_url from Cloudinary or embed URL
    public_id: { type: String }, // Cloudinary public_id
    resource_type: { type: String }, // 'image' or 'video'
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number }, // For videos
    thumbnailUrl: { type: String },
    altText: { type: String },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  
  order: { type: Number, default: 0, index: true },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

projectSchema.index({ category: 1, order: 1 });
projectSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Project', projectSchema);
