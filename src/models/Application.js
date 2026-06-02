const mongoose = require('mongoose')

const ApplicationSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, lowercase: true },
  phone:    { type: String, default: '' },
  position: { type: String, required: true },
  cvLink:   { type: String, required: true },
  career:   { type: mongoose.Schema.Types.ObjectId, ref: 'Career', default: null },
  status:   { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' },
  notes:    { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Application', ApplicationSchema)
