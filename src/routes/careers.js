const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const Career = require('../models/Career')
const Application = require('../models/Application')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const { sendApplicationNotification } = require('../utils/mailer')
const paginate = require('../middleware/paginate')

const applyRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many applications submitted. Please try again later.' },
})

const careerValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('type').optional().isIn(['full-time', 'part-time', 'internship']).withMessage('Invalid type'),
  body('location').optional().trim(),
  body('status').optional().isIn(['active', 'closed']).withMessage('Invalid status'),
  body('category').optional().isIn(['jobs', 'training']).withMessage('Invalid category'),
  body('requirements').optional().isArray().withMessage('Requirements must be an array'),
]

const applicationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim(),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('cvLink').trim().notEmpty().withMessage('CV link is required').isURL().withMessage('CV link must be a valid URL'),
  body('career').optional().isMongoId().withMessage('Invalid career ID'),
]

// ─── Public routes (order matters: static before /:id) ───────────────────────

// List active openings
router.get('/', async (req, res) => {
  try {
    const { category, type } = req.query
    const filter = { status: 'active' }
    if (category) filter.category = category
    if (type) filter.type = type
    const { page, limit, skip } = paginate(req)
    const [total, careers] = await Promise.all([
      Career.countDocuments(filter),
      Career.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: careers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Submit job application
router.post('/apply', applyRateLimit, applicationValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const application = await Application.create(req.body)
    await sendApplicationNotification(application)
    res.status(201).json({ success: true, data: { id: application._id, message: 'Application submitted successfully' } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ─── Admin-only routes (static before /:id) ───────────────────────────────────

// All jobs including closed
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { category, status, type } = req.query
    const filter = {}
    if (category) filter.category = category
    if (status) filter.status = status
    if (type) filter.type = type
    const { page, limit, skip } = paginate(req)
    const [total, careers] = await Promise.all([
      Career.countDocuments(filter),
      Career.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: careers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// All applications
router.get('/applications', protect, async (req, res) => {
  try {
    const { status, career: careerId } = req.query
    const filter = {}
    if (status) filter.status = status
    if (careerId) filter.career = careerId
    const { page, limit, skip } = paginate(req)
    const [total, apps] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .populate('career', 'title type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ])
    res.json({ success: true, data: apps, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Update application status/notes
router.put('/applications/:id', protect, [
  body('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
  body('notes').optional().trim(),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const update = {}
    if (req.body.status !== undefined) update.status = req.body.status
    if (req.body.notes  !== undefined) update.notes  = req.body.notes
    const app = await Application.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' })
    await logAction(req.user.id, 'update', 'Application', req.params.id, `Status: ${app.status}`)
    res.json({ success: true, data: app })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ─── /:id must come after all static routes ───────────────────────────────────

// Public: single active job
router.get('/:id', async (req, res) => {
  try {
    const career = await Career.findOne({ _id: req.params.id, status: 'active' })
    if (!career) return res.status(404).json({ success: false, message: 'Job not found' })
    res.json({ success: true, data: career })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin CRUD
router.post('/', protect, careerValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const career = await Career.create(req.body)
    await logAction(req.user.id, 'create', 'Career', career._id.toString(), career.title)
    res.status(201).json({ success: true, data: career })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, careerValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const career = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!career) return res.status(404).json({ success: false, message: 'Job not found' })
    await logAction(req.user.id, 'update', 'Career', req.params.id, career.title)
    res.json({ success: true, data: career })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const career = await Career.findByIdAndDelete(req.params.id)
    if (!career) return res.status(404).json({ success: false, message: 'Job not found' })
    await logAction(req.user.id, 'delete', 'Career', req.params.id, career.title)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
