const express = require('express')
const router = express.Router()
const AuditLog = require('../models/AuditLog')
const { protect } = require('../middleware/auth')

router.get('/', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const log = await AuditLog.create(req.body)
    res.status(201).json({ success: true, data: log })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router