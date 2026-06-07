const router = require('express').Router()
const { body } = require('express-validator')
const Blog = require('../models/Blog')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const safeStr = (val) => (typeof val === 'string' ? val : undefined)

const BLOG_STATUSES = ['published', 'draft']

const blogValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('status').optional().isIn(BLOG_STATUSES).withMessage('Invalid status'),
  body('author').optional().trim().isLength({ max: 100 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().trim().isLength({ max: 300 }),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
]

// Public: paginated published posts
router.get('/', async (req, res) => {
  try {
    const category = safeStr(req.query.category)
    const tag      = safeStr(req.query.tag)
    const search   = safeStr(req.query.search)

    const filter = { status: 'published' }
    if (category) filter.category = category
    if (tag) filter.tags = { $in: [tag] }
    if (search) {
      const re = new RegExp(escapeRegex(search.slice(0, 100)), 'i')
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

// Public: single post by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, status: 'published' })
    if (!post) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: all posts including drafts
router.get('/admin/all', protect, async (req, res) => {
  try {
    const category = safeStr(req.query.category)
    const status   = safeStr(req.query.status)
    const search   = safeStr(req.query.search)

    const filter = {}
    if (category) filter.category = category
    if (status && BLOG_STATUSES.includes(status)) filter.status = status
    if (search) filter.title = { $regex: escapeRegex(search.slice(0, 100)), $options: 'i' }

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
    const { title, content, excerpt, coverImage, category, tags, status, author,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, featuredImage } = req.body
    const post = await Blog.create({
      title, content, excerpt, coverImage, category, tags, status, author,
      metaTitle, metaDescription, metaKeywords, canonicalUrl, featuredImage,
    })
    await logAction(req.user.id, 'create', 'Blog', post._id.toString(), post.title)
    res.status(201).json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, blogValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, content, excerpt, coverImage, category, tags, status, author,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, featuredImage } = req.body
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: { title, content, excerpt, coverImage, category, tags, status, author,
                metaTitle, metaDescription, metaKeywords, canonicalUrl, featuredImage } },
      { new: true, runValidators: true },
    )
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
