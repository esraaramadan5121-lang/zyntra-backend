const router = require('express').Router()
const { body } = require('express-validator')
const Service = require('../models/Service')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const serviceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('icon').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('features').optional().isArray().withMessage('Features must be an array'),
]

// Public: active services (paginated; usually returned in full for the services page)
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req, 50) // high default — services page wants all
    const filter = { status: 'active' }
    const [total, services] = await Promise.all([
      Service.countDocuments(filter),
      Service.find(filter).sort({ order: 1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: all services including inactive
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const { page, limit, skip } = paginate(req, 50)
    const [total, services] = await Promise.all([
      Service.countDocuments(filter),
      Service.find(filter).sort({ order: 1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Public: single service by id
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, status: 'active' })
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' })
    res.json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, serviceValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const service = await Service.create(req.body)
    await logAction(req.user.id, 'create', 'Service', service._id.toString(), service.title)
    res.status(201).json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, serviceValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' })
    await logAction(req.user.id, 'update', 'Service', req.params.id, service.title)
    res.json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id)
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' })
    await logAction(req.user.id, 'delete', 'Service', req.params.id, service.title)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
