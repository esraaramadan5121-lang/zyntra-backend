const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const Message = require('../models/Message')
const Contact = require('../models/Contact')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const { sendContactNotification } = require('../utils/mailer')
const paginate = require('../middleware/paginate')

const messageRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages submitted. Please try again later.' },
})

const messageValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim(),
  body('subject').optional().trim(),
  body('message').trim().notEmpty().withMessage('Message is required'),
]

router.post('/', messageRateLimit, messageValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const message = await Message.create(req.body)
    await sendContactNotification(message)

    // Auto-create CRM contact on first contact form submission from this email
    const existing = await Contact.findOne({ email: message.email })
    if (!existing) {
      await Contact.create({
        name: message.name,
        email: message.email,
        phone: message.phone || '',
        source: 'website',
        status: 'new',
        notes: message.subject ? `Via contact form: ${message.subject}` : 'Via contact form',
      })
    }

    res.status(201).json({ success: true, data: message })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const { page, limit, skip } = paginate(req)
    const [total, messages] = await Promise.all([
      Message.countDocuments(filter),
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: messages, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, [
  body('status').isIn(['new', 'read', 'replied']).withMessage('Invalid status value'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    )
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' })
    await logAction(req.user.id, 'update', 'Message', req.params.id, `Status: ${req.body.status}`)
    res.json({ success: true, data: message })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id)
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' })
    await logAction(req.user.id, 'delete', 'Message', req.params.id, msg.name)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
