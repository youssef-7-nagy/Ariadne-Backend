const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  coverImage: { type: String },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Category', categorySchema);
