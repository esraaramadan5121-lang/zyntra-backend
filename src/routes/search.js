const router = require('express').Router()
const Service = require('../models/Service')
const Project = require('../models/Project')
const Blog = require('../models/Blog')

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

router.get('/', async (req, res) => {
  try {
    const raw = req.query.q
    if (typeof raw !== 'string') {
      return res.json({ success: true, data: { services: [], projects: [], blog: [] } })
    }
    const q = raw.trim().slice(0, 100) // cap length
    if (!q) {
      return res.json({ success: true, data: { services: [], projects: [], blog: [] } })
    }

    const re = new RegExp(escapeRegex(q), 'i')

    const [services, projects, blog] = await Promise.all([
      Service.find(
        { $or: [{ title: re }, { description: re }] },
        'title description',
      ).lean(),
      Project.find(
        { $or: [{ title: re }, { description: re }], status: 'published' },
        'title description category',
      ).lean(),
      Blog.find(
        { $or: [{ title: re }, { excerpt: re }], status: 'published' },
        'title slug excerpt category',
      ).lean(),
    ])

    res.json({
      success: true,
      data: {
        services: services.map((s) => ({ id: s._id, title: s.title, type: 'service', href: '/services' })),
        projects: projects.map((p) => ({ id: p._id, title: p.title, type: 'project', href: `/projects/${p._id}` })),
        blog: blog.map((b) => ({ id: b._id, title: b.title, type: 'blog', slug: b.slug, href: `/blog/${b.slug}` })),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
