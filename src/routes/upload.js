const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { upload, uploadToCloudinary } = require('../config/cloudinary')
const { protect } = require('../middleware/auth')

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
})

router.post('/', protect, uploadLimiter, (req, res) => {
  const configured = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .every(k => process.env[k])
  if (!configured) {
    return res.status(500).json({ success: false, message: 'File upload service is not configured' })
  }

  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded — send multipart/form-data with field name "image"',
      })
    }
    try {
      const result = await uploadToCloudinary(req.file)
      res.json({ success: true, url: result.secure_url })
    } catch {
      res.status(500).json({ success: false, message: 'Upload failed. Please try again.' })
    }
  })
})

module.exports = router
