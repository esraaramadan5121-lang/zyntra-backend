const router = require('express').Router()
const { body } = require('express-validator')
const Category = require('../models/Category')
const Blog = require('../models/Blog')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

const toSlug = (str) =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')

const categoryValidation = [
  body('nameEn').trim().notEmpty().withMessage('English name is required').isLength({ max: 100 }),
  body('nameAr').trim().notEmpty().withMessage('Arabic name is required').isLength({ max: 100 }),
  body('slug').optional().trim().isLength({ max: 120 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
]

const withCounts = async (categories) => {
  const ids = categories.map(c => c._id)
  const counts = await Blog.aggregate([
    { $match: { categoryId: { $in: ids } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ])
  const map = {}
  counts.forEach(c => { map[c._id.toString()] = c.count })
  return categories.map(c => ({ ...c.toObject(), articlesCount: map[c._id.toString()] || 0 }))
}

// GET /api/categories — public, active only with article counts
router.get('/', async (req, res) => {
  try {
    const cats = await Category.find({ status: 'active' }).sort({ nameEn: 1 })
    res.json({ success: true, data: await withCounts(cats) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/categories/admin/all — protected, all categories with article counts
router.get('/admin/all', protect, async (req, res) => {
  try {
    const cats = await Category.find().sort({ createdAt: -1 })
    res.json({ success: true, data: await withCounts(cats) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/categories
router.post('/', protect, categoryValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { nameEn, nameAr, slug: rawSlug, description, status } = req.body
    const slug = rawSlug ? rawSlug.toLowerCase().trim() : toSlug(nameEn)
    const exists = await Category.findOne({ slug })
    if (exists) return res.status(400).json({ success: false, message: 'Slug already in use' })
    const cat = await Category.create({ nameEn, nameAr, slug, description, status })
    await logAction(req.user.id, 'CREATE', 'Category', cat._id.toString(), cat.nameEn)
    res.status(201).json({ success: true, data: { ...cat.toObject(), articlesCount: 0 } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/categories/:id
router.put('/:id', protect, categoryValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { nameEn, nameAr, slug: rawSlug, description, status } = req.body
    const slug = rawSlug ? rawSlug.toLowerCase().trim() : toSlug(nameEn)
    const conflict = await Category.findOne({ slug, _id: { $ne: req.params.id } })
    if (conflict) return res.status(400).json({ success: false, message: 'Slug already in use' })
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { nameEn, nameAr, slug, description, status } },
      { new: true, runValidators: true }
    )
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' })
    await logAction(req.user.id, 'UPDATE', 'Category', req.params.id, cat.nameEn)
    res.json({ success: true, data: cat })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/categories/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id)
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' })
    await logAction(req.user.id, 'DELETE', 'Category', req.params.id, cat.nameEn)
    res.json({ success: true, message: 'Category deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
