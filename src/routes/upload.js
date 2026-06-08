const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { upload, uploadToCloudinary } = require('../config/cloudinary')
const { protect } = require('../middleware/auth')
const Media = require('../models/Media')

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
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
      const media = await Media.create({
        filename:     result.public_id,
        originalName: req.file.originalname,
        url:          result.secure_url,
        publicId:     result.public_id,
        size:         result.bytes || req.file.size || 0,
        mimeType:     req.file.mimetype,
        width:        result.width  || 0,
        height:       result.height || 0,
        uploadedBy:   req.user?.id || null,
      })
      res.json({ success: true, url: result.secure_url, data: media })
    } catch {
      res.status(500).json({ success: false, message: 'Upload failed. Please try again.' })
    }
  })
})

module.exports = router
