const mongoose = require('mongoose')

const TagSchema = new mongoose.Schema({
  nameEn: { type: String, required: true },
  nameAr: { type: String, required: true },
  slug:   { type: String, required: true, unique: true, lowercase: true },
}, { timestamps: true })

module.exports = mongoose.model('Tag', TagSchema)
