const mongoose = require('mongoose')

const StageSchema = new mongoose.Schema({
  key:         { type: String, required: true },
  label:       { type: String, required: true },
  order:       { type: Number, default: 0 },
  color:       { type: String, default: '#6b7280' },
  probability: { type: Number, default: 10 },
}, { _id: false })

const defaultStages = [
  { key: 'lead',        label: 'Lead',        order: 1, color: '#6b7280', probability: 10  },
  { key: 'qualified',   label: 'Qualified',   order: 2, color: '#3b82f6', probability: 25  },
  { key: 'proposal',    label: 'Proposal',    order: 3, color: '#f59e0b', probability: 50  },
  { key: 'negotiation', label: 'Negotiation', order: 4, color: '#8b5cf6', probability: 75  },
  { key: 'closed-won',  label: 'Closed Won',  order: 5, color: '#10b981', probability: 100 },
  { key: 'closed-lost', label: 'Closed Lost', order: 6, color: '#ef4444', probability: 0   },
]

const PipelineSchema = new mongoose.Schema({
  name:   { type: String, required: true, default: 'Default' },
  stages: { type: [StageSchema], default: defaultStages },
}, { timestamps: true })

module.exports = mongoose.model('Pipeline', PipelineSchema)
