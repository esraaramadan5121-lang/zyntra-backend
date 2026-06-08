const router = require('express').Router()
const { body } = require('express-validator')
const Blog = require('../models/Blog')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')
const paginate = require('../middleware/paginate')

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const safeStr = (val) => (typeof val === 'string' ? val : undefined)

const BLOG_STATUSES = ['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived', 'scheduled']

const notifyByRole = async (roles, type, message, entityId) => {
  try {
    const users = await User.find({ role: { $in: roles } }).select('_id')
    if (users.length) {
      await Notification.insertMany(users.map(u => ({ userId: u._id, type, message, entityId })))
    }
  } catch {}
}

const blogValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('categoryId').optional(),
  body('status').optional().isIn(BLOG_STATUSES).withMessage('Invalid status'),
  body('author').optional().trim().isLength({ max: 100 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().trim().isLength({ max: 300 }),
  body('canonicalUrl').optional().trim().isLength({ max: 500 }),
  body('structuredData').optional().trim(),
  body('ogImage').optional().trim().isLength({ max: 500 }),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tagIds').optional().isArray().withMessage('tagIds must be an array'),
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
    const { title, content, excerpt, coverImage, category, categoryId, tags, tagIds, status, author,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, structuredData, ogImage, featuredImage } = req.body
    const post = await Blog.create({
      title, content, excerpt, coverImage, category, categoryId: categoryId || null,
      tags, tagIds: Array.isArray(tagIds) ? tagIds : [],
      status, authorId: req.user.id, author, metaTitle, metaDescription, metaKeywords,
      canonicalUrl, structuredData, ogImage, featuredImage,
    })
    await logAction(req.user.id, 'create', 'Blog', post._id.toString(), post.title)
    res.status(201).json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, blogValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { title, content, excerpt, coverImage, category, categoryId, tags, tagIds, status, author,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, structuredData, ogImage, featuredImage } = req.body
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: { title, content, excerpt, coverImage, category, categoryId: categoryId || null,
                tags, tagIds: Array.isArray(tagIds) ? tagIds : [],
                status, author, metaTitle, metaDescription, metaKeywords,
                canonicalUrl, structuredData, ogImage, featuredImage } },
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

// GET /scheduled — admin view of all scheduled posts
router.get('/scheduled', protect, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin required' })
  }
  try {
    const posts = await Blog.find({ status: 'scheduled' }, '-content').sort({ scheduledAt: 1 })
    res.json({ success: true, data: posts })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/schedule
router.put('/:id/schedule', protect, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin required' })
  }
  if (!req.body.scheduledAt) {
    return res.status(422).json({ success: false, message: 'scheduledAt is required' })
  }
  const scheduledAt = new Date(req.body.scheduledAt)
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return res.status(422).json({ success: false, message: 'scheduledAt must be a future date' })
  }
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    post.status = 'scheduled'
    post.scheduledAt = scheduledAt
    await post.save()
    await logAction(req.user.id, 'SCHEDULE', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/unschedule
router.put('/:id/unschedule', protect, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin required' })
  }
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (post.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Post is not scheduled' })
    }
    post.status = 'draft'
    post.scheduledAt = null
    await post.save()
    await logAction(req.user.id, 'UNSCHEDULE', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ─── Workflow ────────────────────────────────────────────────────────────────

// GET /admin/pending — editor/admin view
router.get('/admin/pending', protect, async (req, res) => {
  if (!['editor', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Editor or Admin required' })
  }
  try {
    const posts = await Blog.find({ status: 'pending_review' }, '-content').sort({ submittedAt: -1 })
    res.json({ success: true, data: posts })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/submit
router.put('/:id/submit', protect, async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (!['draft', 'rejected'].includes(post.status)) {
      return res.status(400).json({ success: false, message: 'Only draft or rejected articles can be submitted for review' })
    }
    post.status = 'pending_review'
    post.submittedAt = new Date()
    await post.save()
    await notifyByRole(['editor', 'admin', 'superadmin'], 'submitted', `New article submitted for review: "${post.title}"`, post._id)
    await logAction(req.user.id, 'SUBMIT_REVIEW', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/approve
router.put('/:id/approve', protect, async (req, res) => {
  if (!['editor', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Editor or Admin required' })
  }
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (post.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Article must be pending review to approve' })
    }
    post.status = 'approved'
    post.reviewedBy = req.user.id
    post.reviewedAt = new Date()
    if (req.body.reviewNotes) post.reviewNotes = req.body.reviewNotes
    await post.save()
    if (post.authorId) {
      await Notification.create({ userId: post.authorId, type: 'approved', message: `Your article "${post.title}" has been approved!`, entityId: post._id })
    }
    await logAction(req.user.id, 'APPROVE', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/reject  (requestChanges=true sends back to draft)
router.put('/:id/reject', protect, async (req, res) => {
  if (!['editor', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Editor or Admin required' })
  }
  if (!req.body.rejectionReason?.trim()) {
    return res.status(422).json({ success: false, message: 'Rejection reason is required' })
  }
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (post.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Article must be pending review to reject' })
    }
    const requestChanges = !!req.body.requestChanges
    post.status = requestChanges ? 'draft' : 'rejected'
    post.reviewedBy = req.user.id
    post.reviewedAt = new Date()
    post.rejectionReason = req.body.rejectionReason.trim()
    if (req.body.reviewNotes) post.reviewNotes = req.body.reviewNotes
    await post.save()
    if (post.authorId) {
      const type = requestChanges ? 'changes_requested' : 'rejected'
      const msg = requestChanges
        ? `Changes requested on your article "${post.title}": ${req.body.rejectionReason}`
        : `Your article "${post.title}" was rejected: ${req.body.rejectionReason}`
      await Notification.create({ userId: post.authorId, type, message: msg, entityId: post._id })
    }
    await logAction(req.user.id, requestChanges ? 'REQUEST_CHANGES' : 'REJECT', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /:id/publish
router.put('/:id/publish', protect, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin required' })
  }
  try {
    const post = await Blog.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    post.status = 'published'
    post.publishedAt = new Date()
    await post.save()
    if (post.authorId) {
      await Notification.create({ userId: post.authorId, type: 'published', message: `Your article "${post.title}" has been published!`, entityId: post._id })
    }
    await logAction(req.user.id, 'PUBLISH', 'Blog', post._id.toString(), post.title)
    res.json({ success: true, data: post })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
