const router = require('express').Router()
const { body } = require('express-validator')
const Contact = require('../models/Contact')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const safeStr = (val) => (typeof val === 'string' ? val : undefined)

const CONTACT_SOURCES  = ['website', 'referral', 'social', 'email', 'other']
const CONTACT_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const PIPELINE_STAGES  = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost', '']

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('company').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('source').optional().isIn(CONTACT_SOURCES).withMessage('Invalid source'),
  body('status').optional().isIn(CONTACT_STATUSES).withMessage('Invalid status'),
  body('pipelineStage').optional().isIn(PIPELINE_STAGES).withMessage('Invalid pipeline stage'),
  body('assignedTo').optional().isMongoId().withMessage('Invalid assignedTo ID'),
]

router.get('/', protect, async (req, res) => {
  try {
    const status        = safeStr(req.query.status)
    const pipelineStage = safeStr(req.query.pipelineStage)
    const search        = safeStr(req.query.search)

    const filter = {}
    if (status && CONTACT_STATUSES.includes(status))       filter.status = status
    if (pipelineStage && PIPELINE_STAGES.includes(pipelineStage)) filter.pipelineStage = pipelineStage
    if (search) {
      const re = new RegExp(escapeRegex(search.slice(0, 100)), 'i')
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
    const { name, email, phone, company, source, status, pipelineStage, notes, assignedTo } = req.body
    const contact = await Contact.create({ name, email, phone, company, source, status, pipelineStage, notes, assignedTo })
    await logAction(req.user.id, 'create', 'Contact', contact._id.toString(), contact.name)
    res.status(201).json({ success: true, data: contact })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, contactValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { name, email, phone, company, source, status, pipelineStage, notes, assignedTo } = req.body
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: { name, email, phone, company, source, status, pipelineStage, notes, assignedTo } },
      { new: true, runValidators: true },
    )
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
