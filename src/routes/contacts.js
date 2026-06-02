const router = require('express').Router()
const { body } = require('express-validator')
const Contact = require('../models/Contact')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('notes').optional().trim(),
  body('source').optional().isIn(['website', 'referral', 'social', 'email', 'other']).withMessage('Invalid source'),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).withMessage('Invalid status'),
  body('pipelineStage').optional().isIn(['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost', '']).withMessage('Invalid pipeline stage'),
]

router.get('/', protect, async (req, res) => {
  try {
    const { status, pipelineStage, search } = req.query
    const filter = {}
    if (status) filter.status = status
    if (pipelineStage) filter.pipelineStage = pipelineStage
    if (search) {
      const re = new RegExp(search, 'i')
      filter.$or = [{ name: re }, { email: re }, { company: re }]
    }
    const { page, limit, skip } = paginate(req)
    const [total, contacts] = await Promise.all([
      Contact.countDocuments(filter),
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: contacts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' })
    res.json({ success: true, data: contact })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, contactValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const contact = await Contact.create(req.body)
    await logAction(req.user.id, 'create', 'Contact', contact._id.toString(), contact.name)
    res.status(201).json({ success: true, data: contact })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, contactValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' })
    await logAction(req.user.id, 'update', 'Contact', req.params.id, contact.name)
    res.json({ success: true, data: contact })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id)
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' })
    await logAction(req.user.id, 'delete', 'Contact', req.params.id, contact.name)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
