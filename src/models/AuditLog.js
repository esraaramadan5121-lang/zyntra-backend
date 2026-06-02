const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  action:   { type: String, required: true },   // create | update | delete
  entity:   { type: String, required: true },   // Service | Project | Blog | Message | Contact | Deal
  entityId: { type: String, default: '' },
  details:  { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('AuditLog', AuditLogSchema)
