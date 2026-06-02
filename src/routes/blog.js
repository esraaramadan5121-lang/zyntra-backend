const router = require('express').Router()
const { body } = require('express-validator')
const Blog = require('../models/Blog')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const blogValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim(),
  body('category').optional().trim(),
  body('status').optional().isIn(['published', 'draft']).withMessage('Invalid status'),
  body('author').optional().trim(),
  body('metaTitle').optional().trim(),
  body('metaDescription').optional().trim(),
  body('metaKeywords').optional().trim(),
]

// Public: paginated published posts (default 9 per page for blog grid)
router.get('/', async (req, res) => {
  try {
    const { category, tag, search } = req.query
    const filter = { status: 'published' }
    if (category) filter.category = category
    if (tag) filter.tags = { $in: [tag] }
    if (search) {
      const re = new RegExp(search, 'i')
      filter.$or = [{ title: re }, { excerpt: re }]
    }
    const { page, limit, skip } = paginate(req, 9)
    const [total, posts] = await Promise.all([
      Blog.countDocuments(filter),
      Blog.find(filter, '-content').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Public: single post by slug (full content)
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, status: 'published' })
    if (!post) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: all posts including drafts (paginated)
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { category, status, search } = req.query
    const filter = {}
    if (category) filter.category = category
    if (status) filter.status = status
    if (search) filter.title = { $regex: search, $options: 'i' }
    const { page, limit, skip } = paginate(req)
    const [total, posts] = await Promise.all([
      Blog.countDocuments(filter),
      Blog.find(filter, '-content').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, blogValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const post = await Blog.create(req.body)
    await logAction(req.user.id, 'create', 'Blog', post._id.toString(), post.title)
    res.status(201).json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, blogValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const post = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!post) return res.status(404).json({ success: false, message: 'Not found' })
    await logAction(req.user.id, 'update', 'Blog', req.params.id, post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Blog.findByIdAndDelete(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Not found' })
    await logAction(req.user.id, 'delete', 'Blog', req.params.id, post.title)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
