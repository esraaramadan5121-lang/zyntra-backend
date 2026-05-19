const router = require('express').Router()
const { upload } = require('../config/cloudinary')
const { protect } = require('../middleware/auth')

router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    res.json({ success: true, url: req.file.path })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router