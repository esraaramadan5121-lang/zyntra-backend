const express = require('express')
const router = express.Router()
const AuditLog = require('../models/AuditLog')
const { protect } = require('../middleware/auth')
const paginate = require('../middleware/paginate')

// GET /api/audit-logs — paginated, newest first
router.get('/', protect, async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req, 50)
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])
    res.json({ success: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST endpoint removed — audit logs are created internally only

module.exports = router
