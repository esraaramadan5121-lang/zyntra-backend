const mongoose = require('mongoose')

const ProjectSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  image:       { type: String, default: '' },
  status:      { type: String, enum: ['published', 'draft'], default: 'published' },
  featured:    { type: Boolean, default: false },
  client:      { type: String, default: '' },
  results:     [{ type: String }],
}, { timestamps: true })

module.exports = mongoose.model('Project', ProjectSchema)
