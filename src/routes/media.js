const router = require('express').Router()
const Media = require('../models/Media')
const { cloudinary } = require('../config/cloudinary')
const { protect, logAction } = require('../middleware/auth')

// GET /api/media — list all, newest first
router.get('/', protect, async (req, res) => {
  try {
    const q = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : ''
    const filter = q ? { originalName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}
    const media = await Media.find(filter).sort({ createdAt: -1 }).limit(500)
    res.json({ success: true, data: media })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/media/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
    if (!media) return res.status(404).json({ success: false, message: 'File not found' })
    if (media.publicId) {
      try { await cloudinary.uploader.destroy(media.publicId) } catch {}
    }
    await media.deleteOne()
    await logAction(req.user.id, 'DELETE', 'Media', req.params.id, media.originalName)
    res.json({ success: true, message: 'File deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
