const router = require('express').Router()
const { body } = require('express-validator')
const mongoose = require('mongoose')
const Tag = require('../models/Tag')
const Blog = require('../models/Blog')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

const toSlug = (str) =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')

const tagValidation = [
  body('nameEn').trim().notEmpty().withMessage('English name is required').isLength({ max: 80 }),
  body('nameAr').trim().notEmpty().withMessage('Arabic name is required').isLength({ max: 80 }),
  body('slug').optional().trim().isLength({ max: 100 }),
]

const withCounts = async (tags) => {
  const ids = tags.map(t => t._id)
  const counts = await Blog.aggregate([
    { $match: { tagIds: { $in: ids } } },
    { $unwind: '$tagIds' },
    { $match: { tagIds: { $in: ids } } },
    { $group: { _id: '$tagIds', count: { $sum: 1 } } },
  ])
  const map = {}
  counts.forEach(c => { map[c._id.toString()] = c.count })
  return tags.map(t => ({ ...t.toObject(), articlesCount: map[t._id.toString()] || 0 }))
}

// GET /api/tags — public
router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find().sort({ nameEn: 1 })
    res.json({ success: true, data: await withCounts(tags) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/tags
router.post('/', protect, tagValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { nameEn, nameAr, slug: rawSlug } = req.body
    const slug = rawSlug ? rawSlug.toLowerCase().trim() : toSlug(nameEn)
    const exists = await Tag.findOne({ slug })
    if (exists) return res.status(400).json({ success: false, message: 'Slug already in use' })
    const tag = await Tag.create({ nameEn, nameAr, slug })
    await logAction(req.user.id, 'CREATE', 'Tag', tag._id.toString(), tag.nameEn)
    res.status(201).json({ success: true, data: { ...tag.toObject(), articlesCount: 0 } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/tags/:id
router.put('/:id', protect, tagValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { nameEn, nameAr, slug: rawSlug } = req.body
    const slug = rawSlug ? rawSlug.toLowerCase().trim() : toSlug(nameEn)
    const conflict = await Tag.findOne({ slug, _id: { $ne: req.params.id } })
    if (conflict) return res.status(400).json({ success: false, message: 'Slug already in use' })
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { $set: { nameEn, nameAr, slug } },
      { new: true, runValidators: true }
    )
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' })
    await logAction(req.user.id, 'UPDATE', 'Tag', req.params.id, tag.nameEn)
    res.json({ success: true, data: tag })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/tags — bulk delete (must be before /:id)
router.delete('/', protect, async (req, res) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' })
    }
    const validIds = ids.filter(id => mongoose.isValidObjectId(id))
    const result = await Tag.deleteMany({ _id: { $in: validIds } })
    await logAction(req.user.id, 'DELETE', 'Tag', '', `Bulk deleted ${result.deletedCount} tags`)
    res.json({ success: true, deletedCount: result.deletedCount })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/tags/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id)
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' })
    await logAction(req.user.id, 'DELETE', 'Tag', req.params.id, tag.nameEn)
    res.json({ success: true, message: 'Tag deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
