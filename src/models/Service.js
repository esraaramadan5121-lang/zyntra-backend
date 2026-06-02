const mongoose = require('mongoose')

const ServiceSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  icon:        { type: String, default: '' },
  status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
  order:       { type: Number, default: 0 },
  features:    [{ type: String }],
}, { timestamps: true })

module.exports = mongoose.model('Service', ServiceSchema)
