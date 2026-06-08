const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:       { type: String, enum: ['submitted', 'approved', 'rejected', 'published', 'changes_requested'], default: 'submitted' },
  message:    { type: String, required: true },
  entityId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
  entityType: { type: String, default: 'Blog' },
  read:       { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Notification', NotificationSchema)
