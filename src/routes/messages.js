const router = require('express').Router()
const Message = require('../models/Message')
const { protect } = require('../middleware/auth')
const { sendContactNotification } = require('../utils/mailer')

router.post('/', async (req, res) => {
  try {
    const message = await Message.create(req.body)
    await sendContactNotification(message)
    res.status(201).json({ success: true, data: message })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})


router.post('/', async (req, res) => {
  try {
    const message = await Message.create(req.body)
    res.status(201).json({ success: true, data: message })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 })
    res.json({ success: true, data: messages })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true })
    res.json({ success: true, data: message })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router