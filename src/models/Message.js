const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  phone:   { type: String, default: '' },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  status:  { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
}, { timestamps: true })

module.exports = mongoose.model('Message', MessageSchema)