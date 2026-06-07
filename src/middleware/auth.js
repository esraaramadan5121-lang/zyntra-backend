const jwt = require('jsonwebtoken')
const AuditLog = require('../models/AuditLog')

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }
    const token = authHeader.slice(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }
}

const logAction = async (userId, action, entity, entityId = '', details = '') => {
  try {
    await AuditLog.create({ userId, action, entity, entityId, details })
  } catch {}
}

module.exports = { protect, logAction }
