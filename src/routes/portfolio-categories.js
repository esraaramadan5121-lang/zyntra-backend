const router = require('express').Router()
const PortfolioCategory = require('../models/PortfolioCategory')
const Project = require('../models/Project')
const { protect, logAction } = require('../middleware/auth')
const { DEFAULT_CATEGORIES } = require('../models/PortfolioCategory')

const slugify = (str) =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')

const seedDefaults = async () => {
  try {
    const count = await PortfolioCategory.countDocuments()
    if (count === 0) {
      await PortfolioCategory.insertMany(DEFAULT_CATEGORIES)
    }
  } catch {}
}

// GET /api/portfolio-categories  (public)
router.get('/', async (req, res) => {
  await seedDefaults()
  try {
    const categories = await PortfolioCategory.find({ status: 'active' }).sort({ order: 1, createdAt: 1 })
    // Attach project counts
    const counts = await Project.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]))
    const result = categories.map(c => ({ ...c.toObject(), projectCount: countMap[c.nameEn] || 0 }))
    res.json({ success: true, data: result })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/portfolio-categories/admin/all  (protected — includes inactive)
router.get('/admin/all', protect, async (req, res) => {
  await seedDefaults()
  try {
    const categories = await PortfolioCategory.find().sort({ order: 1, createdAt: 1 })
    const counts = await Project.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]))
    const result = categories.map(c => ({ ...c.toObject(), projectCount: countMap[c.nameEn] || 0 }))
    res.json({ success: true, data: result })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/portfolio-categories  (protected)
router.post('/', protect, async (req, res) => {
  try {
    const { nameEn, nameAr, color, icon, order, status } = req.body
    if (!nameEn?.trim()) return res.status(422).json({ success: false, message: 'nameEn is required' })
    const slug = slugify(nameEn)
    const exists = await PortfolioCategory.findOne({ slug })
    if (exists) return res.status(400).json({ success: false, message: 'Category already exists' })
    const maxOrder = await PortfolioCategory.findOne().sort({ order: -1 }).select('order')
    const cat = await PortfolioCategory.create({
      nameEn: nameEn.trim(),
      nameAr: (nameAr || '').trim(),
      slug,
      color: color || '#3B82F6',
      icon: icon || '◉',
      order: order ?? ((maxOrder?.order ?? 0) + 1),
      status: status || 'active',
      isBuiltIn: false,
    })
    await logAction(req.user.id, 'CREATE', 'PortfolioCategory', cat._id.toString(), cat.nameEn)
    res.status(201).json({ success: true, data: cat })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/portfolio-categories/:id  (protected)
router.put('/:id', protect, async (req, res) => {
  try {
    const { nameEn, nameAr, color, icon, order, status } = req.body
    const cat = await PortfolioCategory.findById(req.params.id)
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' })
    if (nameEn !== undefined) { cat.nameEn = nameEn.trim(); cat.slug = slugify(nameEn) }
    if (nameAr !== undefined) cat.nameAr = nameAr
    if (color  !== undefined) cat.color = color
    if (icon   !== undefined) cat.icon = icon
    if (order  !== undefined) cat.order = order
    if (status !== undefined) cat.status = status
    await cat.save()
    await logAction(req.user.id, 'UPDATE', 'PortfolioCategory', cat._id.toString(), cat.nameEn)
    res.json({ success: true, data: cat })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/portfolio-categories/:id  (protected)
router.delete('/:id', protect, async (req, res) => {
  try {
    const cat = await PortfolioCategory.findById(req.params.id)
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' })
    await cat.deleteOne()
    await logAction(req.user.id, 'DELETE', 'PortfolioCategory', req.params.id, cat.nameEn)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
