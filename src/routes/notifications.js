const router = require('express').Router()
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')

// Must come before /:id to avoid routing conflict
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/', protect, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50)
    res.json({ success: true, data: notifs })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
