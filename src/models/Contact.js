const mongoose = require('mongoose')

const ContactSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, lowercase: true },
  phone:         { type: String, default: '' },
  company:       { type: String, default: '' },
  source:        { type: String, enum: ['website', 'referral', 'social', 'email', 'other'], default: 'website' },
  status:        { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'], default: 'new' },
  pipelineStage: {
    type: String,
    enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost', ''],
    default: '',
  },
  notes:         { type: String, default: '' },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Contact', ContactSchema)
