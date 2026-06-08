const mongoose = require('mongoose')

const BlogSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  slug:            { type: String, unique: true },
  content:         { type: String, required: true },
  excerpt:         { type: String, default: '' },
  coverImage:      { type: String, default: '' },
  category:        { type: String, default: 'General' },
  categoryId:      { type: require('mongoose').Schema.Types.ObjectId, ref: 'Category', default: null },
  tags:            [{ type: String }],
  tagIds:          [{ type: require('mongoose').Schema.Types.ObjectId, ref: 'Tag' }],
  status:          { type: String, enum: ['published', 'draft'], default: 'draft' },
  author:          { type: String, default: 'ZYNTRA Team' },
  metaTitle:       { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  metaKeywords:    { type: String, default: '' },
  canonicalUrl:    { type: String, default: '' },
  featuredImage:   { type: String, default: '' },
}, { timestamps: true })

BlogSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
  next()
})

module.exports = mongoose.model('Blog', BlogSchema)