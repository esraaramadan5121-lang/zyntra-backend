const mongoose = require('mongoose')

const CareerSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  type:         { type: String, enum: ['full-time', 'part-time', 'internship'], default: 'full-time' },
  location:     { type: String, default: 'Remote' },
  description:  { type: String, required: true },
  requirements: [{ type: String }],
  status:       { type: String, enum: ['active', 'closed'], default: 'active' },
  category:     { type: String, enum: ['jobs', 'training'], default: 'jobs' },
}, { timestamps: true })

module.exports = mongoose.model('Career', CareerSchema)
