const mongoose = require('mongoose')

const DealSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  contact:       { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  value:         { type: Number, default: 0, min: 0 },
  stage:         {
    type: String,
    enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
    default: 'lead',
  },
  probability:   { type: Number, default: 10, min: 0, max: 100 },
  expectedClose: { type: Date },
  notes:         { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Deal', DealSchema)
