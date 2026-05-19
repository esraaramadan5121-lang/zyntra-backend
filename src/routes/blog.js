const router = require('express').Router()
const Blog = require('../models/Blog')
const { protect } = require('../middleware/auth')

// Public - get all published
router.get('/', async (req, res) => {
  try {
    const { category, tag, search } = req.query
    let filter = { status: 'published' }
    if (category) filter.category = category
    if (tag) filter.tags = { $in: [tag] }
    if (search) filter.title = { $regex: search, $options: 'i' }
    const posts = await Blog.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Public - get by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, status: 'published' })
    if (!post) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin - get all (including drafts)
router.get('/admin/all', protect, async (req, res) => {
  try {
    const posts = await Blog.find().sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Create
router.post('/', protect, async (req, res) => {
  try {
    const post = await Blog.create(req.body)
    res.status(201).json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Update
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Delete
router.delete('/:id', protect, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router