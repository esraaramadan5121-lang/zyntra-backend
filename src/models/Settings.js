const mongoose = require('mongoose')

const SettingsSchema = new mongoose.Schema({
  siteName:     { type: String, default: 'ZYNTRA Digital' },
  contactEmail: { type: String, default: 'info@zyntra.ltd' },
  phoneNumber:  { type: String, default: '+20 100 000 0000' },
  address:      { type: String, default: 'Cairo, Egypt' },
}, { timestamps: true })

module.exports = mongoose.model('Settings', SettingsSchema)
