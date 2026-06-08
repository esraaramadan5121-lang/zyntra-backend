const mongoose = require('mongoose')

const MediaSchema = new mongoose.Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  url:          { type: String, required: true },
  publicId:     { type: String, default: '' },
  size:         { type: Number, default: 0 },
  mimeType:     { type: String, default: '' },
  width:        { type: Number, default: 0 },
  height:       { type: Number, default: 0 },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Media', MediaSchema)
