const router = require('express').Router()
const Service = require('../models/Service')
const { protect } = require('../middleware/auth')

router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1 })
    res.json({ success: true, data: services })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', protect, async (req, res) => {
  try {
    const service = await Service.create(req.body)
    res.status(201).json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: service })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router