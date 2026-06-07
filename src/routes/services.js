const router = require('express').Router()
const { body } = require('express-validator')
const Service = require('../models/Service')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const safeStr = (val) => (typeof val === 'string' ? val : undefined)
const SERVICE_STATUSES = ['active', 'inactive']

const serviceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('icon').optional().trim().isLength({ max: 200 }),
  body('status').optional().isIn(SERVICE_STATUSES).withMessage('Invalid status'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('features').optional().isArray().withMessage('Features must be an array'),
]

router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req, 50)
    const filter = { status: 'active' }
    const [total, services] = await Promise.all([
      Service.countDocuments(filter),
      Service.find(filter).sort({ order: 1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.get('/admin/all', protect, async (req, res) => {
  try {
    const status = safeStr(req.query.status)
    const filter = (status && SERVICE_STATUSES.includes(status)) ? { status } : {}
    const { page, limit, skip } = paginate(req, 50)
    const [total, services] = await Promise.all([
      Service.countDocuments(filter),
      Service.find(filter).sort({ order: 1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

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
    const { title, description, icon, status, order, features } = req.body
    const service = await Service.create({ title, description, icon, status, order, features })
    await logAction(req.user.id, 'create', 'Service', service._id.toString(), service.title)
    res.status(201).json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, serviceValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, description, icon, status, order, features } = req.body
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, icon, status, order, features } },
      { new: true, runValidators: true },
    )
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
