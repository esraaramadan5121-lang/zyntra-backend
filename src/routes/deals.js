const router = require('express').Router()
const { body } = require('express-validator')
const Deal = require('../models/Deal')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const safeStr = (val) => (typeof val === 'string' ? val : undefined)

const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost']

const dealValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('contact').notEmpty().withMessage('Contact ID is required').isMongoId().withMessage('Invalid contact ID'),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('stage').optional().isIn(DEAL_STAGES).withMessage('Invalid stage'),
  body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('Probability must be 0–100'),
  body('expectedClose').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 2000 }),
]

router.get('/', protect, async (req, res) => {
  try {
    const stage = safeStr(req.query.stage)
    const filter = (stage && DEAL_STAGES.includes(stage)) ? { stage } : {}
    const { page, limit, skip } = paginate(req)
    const [total, deals] = await Promise.all([
      Deal.countDocuments(filter),
      Deal.find(filter)
        .populate('contact', 'name email company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ])
    res.json({ success: true, data: deals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id).populate('contact', 'name email company phone')
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' })
    res.json({ success: true, data: deal })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, dealValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, contact, value, stage, probability, expectedClose, notes } = req.body
    const deal = await Deal.create({ title, contact, value, stage, probability, expectedClose, notes })
    await logAction(req.user.id, 'create', 'Deal', deal._id.toString(), deal.title)
    res.status(201).json({ success: true, data: deal })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, dealValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, contact, value, stage, probability, expectedClose, notes } = req.body
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $set: { title, contact, value, stage, probability, expectedClose, notes } },
      { new: true, runValidators: true },
    )
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' })
    await logAction(req.user.id, 'update', 'Deal', req.params.id, `${deal.title} → ${deal.stage}`)
    res.json({ success: true, data: deal })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id)
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' })
    await logAction(req.user.id, 'delete', 'Deal', req.params.id, deal.title)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
