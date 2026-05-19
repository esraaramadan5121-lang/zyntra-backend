const jwt = require('jsonwebtoken')
const AuditLog = require('../models/AuditLog')

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid' })
  }
}

const logAction = async (userId, action, entity, entityId = '', details = '') => {
  try {
    await AuditLog.create({ userId, action, entity, entityId, details })
  } catch {}
}

module.exports = { protect, logAction }