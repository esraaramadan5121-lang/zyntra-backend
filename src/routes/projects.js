const router = require('express').Router()
const Project = require('../models/Project')
const { protect } = require('../middleware/auth')

router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    const filter = category ? { category, status: 'published' } : { status: 'published' }
    const projects = await Project.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, data: projects })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, async (req, res) => {
  try {
    const project = await Project.create(req.body)
    res.status(201).json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: project })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router