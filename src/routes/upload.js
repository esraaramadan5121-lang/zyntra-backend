const router = require('express').Router()
const { upload } = require('../config/cloudinary')
const { protect } = require('../middleware/auth')

router.post('/', protect, (req, res) => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    return res.status(500).json({ success: false, message: `Missing env vars: ${missing.join(', ')}` })
  }

  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded — send multipart/form-data with field name "image"' })
    }
    res.json({ success: true, url: req.file.path })
  })
})

module.exports = router