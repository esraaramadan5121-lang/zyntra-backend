const router = require('express').Router()
const { body } = require('express-validator')
const Project = require('../models/Project')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const safeStr = (val) => (typeof val === 'string' ? val : undefined)
const PROJECT_STATUSES = ['published', 'draft']

const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('image').optional().trim().isURL().withMessage('Image must be a valid URL').optional({ values: 'falsy' }),
  body('client').optional().trim().isLength({ max: 100 }),
  body('results').optional().isArray().withMessage('Results must be an array'),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage('Invalid status'),
  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
]

router.get('/', async (req, res) => {
  try {
    const category = safeStr(req.query.category)
    const featured = safeStr(req.query.featured)

    const filter = { status: 'published' }
    if (category) filter.category = category
    if (featured === 'true') filter.featured = true

    const { page, limit, skip } = paginate(req)
    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/admin/all', protect, async (req, res) => {
  try {
    const category = safeStr(req.query.category)
    const status   = safeStr(req.query.status)

    const filter = {}
    if (category) filter.category = category
    if (status && PROJECT_STATUSES.includes(status)) filter.status = status

    const { page, limit, skip } = paginate(req)
    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, status: 'published' })
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    res.json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, projectValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, description, category, image, client, results, status, featured } = req.body
    const project = await Project.create({ title, description, category, image, client, results, status, featured })
    await logAction(req.user.id, 'create', 'Project', project._id.toString(), project.title)
    res.status(201).json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, projectValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, description, category, image, client, results, status, featured } = req.body
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, category, image, client, results, status, featured } },
      { new: true, runValidators: true },
    )
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    await logAction(req.user.id, 'update', 'Project', req.params.id, project.title)
    res.json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id)
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    await logAction(req.user.id, 'delete', 'Project', req.params.id, project.title)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
