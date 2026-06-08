const mongoose = require('mongoose')

const CategorySchema = new mongoose.Schema({
  nameEn:      { type: String, required: true },
  nameAr:      { type: String, required: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

module.exports = mongoose.model('Category', CategorySchema)
