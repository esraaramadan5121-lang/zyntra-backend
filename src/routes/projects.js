const router = require('express').Router()
const { body } = require('express-validator')
const Project = require('../models/Project')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const safeStr = (val) => (typeof val === 'string' ? val : undefined)
const PROJECT_STATUSES = ['published', 'draft', 'featured']

const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('titleAr').optional().trim().isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('descriptionAr').optional().trim(),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('categoryId').optional(),
  body('image').optional({ values: 'falsy' }).trim(),
  body('gallery').optional().isArray().withMessage('Gallery must be an array'),
  body('client').optional().trim().isLength({ max: 100 }),
  body('projectUrl').optional({ values: 'falsy' }).trim(),
  body('githubUrl').optional({ values: 'falsy' }).trim(),
  body('technologies').optional().isArray().withMessage('Technologies must be an array'),
  body('results').optional().isArray().withMessage('Results must be an array'),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage('Invalid status'),
  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
  body('startDate').optional({ values: 'falsy' }),
  body('endDate').optional({ values: 'falsy' }),
]

// Public: published + featured projects
router.get('/', async (req, res) => {
  try {
    const category = safeStr(req.query.category)
    const featured = safeStr(req.query.featured)

    const filter = { status: { $in: ['published', 'featured'] } }
    if (category) filter.category = category
    if (featured === 'true') filter.status = 'featured'

    const { page, limit, skip } = paginate(req)
    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter).sort({ status: -1, createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: all projects including drafts
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
    const project = await Project.findOne({ _id: req.params.id, status: { $in: ['published', 'featured'] } })
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })
    res.json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, projectValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const {
      title, titleAr, description, descriptionAr, category, categoryId,
      image, gallery, client, projectUrl, githubUrl, technologies, results,
      status, featured, startDate, endDate,
    } = req.body
    const project = await Project.create({
      title, titleAr, description, descriptionAr,
      category, categoryId: categoryId || null,
      image, gallery: gallery || [],
      client, projectUrl, githubUrl,
      technologies: technologies || [],
      results: results || [],
      status: status || 'draft',
      featured: !!featured,
      startDate: startDate || null,
      endDate: endDate || null,
    })
    await logAction(req.user.id, 'create', 'Project', project._id.toString(), project.title)
    res.status(201).json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, projectValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const {
      title, titleAr, description, descriptionAr, category, categoryId,
      image, gallery, client, projectUrl, githubUrl, technologies, results,
      status, featured, startDate, endDate,
    } = req.body
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: {
        title, titleAr, description, descriptionAr,
        category, categoryId: categoryId || null,
        image, gallery: gallery || [],
        client, projectUrl, githubUrl,
        technologies: technologies || [],
        results: results || [],
        status, featured: !!featured,
        startDate: startDate || null,
        endDate: endDate || null,
      }},
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
