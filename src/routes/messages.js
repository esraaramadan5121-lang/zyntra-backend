const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const Message = require('../models/Message')
const Contact = require('../models/Contact')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const { sendContactNotification } = require('../utils/mailer')
const paginate = require('../middleware/paginate')

// Only allow plain strings from query params (prevents NoSQL operator injection)
const safeStr = (val) => (typeof val === 'string' ? val : undefined)

const MESSAGE_STATUS = ['new', 'read', 'replied']

const messageRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages submitted. Please try again later.' },
})

const messageValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone too long'),
  body('subject').optional().trim().isLength({ max: 200 }).withMessage('Subject too long'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 2000 }).withMessage('Message too long (max 2000 chars)'),
]

router.post('/', messageRateLimit, messageValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    // Explicit field pick — never pass req.body directly to prevent status/field injection
    const { name, email, phone, subject, message } = req.body
    const doc = await Message.create({ name, email, phone, subject, message })
    await sendContactNotification(doc)

    const existing = await Contact.findOne({ email: doc.email })
    if (!existing) {
      await Contact.create({
        name: doc.name,
        email: doc.email,
        phone: doc.phone || '',
        source: 'website',
        status: 'new',
        notes: doc.subject ? `Via contact form: ${doc.subject}` : 'Via contact form',
      })
    }

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const status = safeStr(req.query.status)
    const filter = (status && MESSAGE_STATUS.includes(status)) ? { status } : {}
    const { page, limit, skip } = paginate(req)
    const [total, messages] = await Promise.all([
      Message.countDocuments(filter),
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: messages, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, [
  body('status').isIn(MESSAGE_STATUS).withMessage('Invalid status value'),
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
