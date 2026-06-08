const mongoose = require('mongoose')

const ProjectSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  titleAr:       { type: String, default: '' },
  description:   { type: String, required: true },
  descriptionAr: { type: String, default: '' },
  category:      { type: String, required: true },
  categoryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioCategory', default: null },
  image:         { type: String, default: '' },
  gallery:       [{ type: String }],
  status:        { type: String, enum: ['published', 'draft', 'featured'], default: 'draft' },
  featured:      { type: Boolean, default: false },
  client:        { type: String, default: '' },
  projectUrl:    { type: String, default: '' },
  githubUrl:     { type: String, default: '' },
  technologies:  [{ type: String }],
  results:       [{ type: String }],
  startDate:     { type: Date, default: null },
  endDate:       { type: Date, default: null },
}, { timestamps: true })

module.exports = mongoose.model('Project', ProjectSchema)
