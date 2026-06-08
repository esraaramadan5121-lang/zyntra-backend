const router = require('express').Router()
const { body } = require('express-validator')
const User = require('../models/User')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

const VALID_ROLES = ['superadmin', 'editor', 'author', 'seo_manager', 'viewer', 'admin']
const VALID_STATUSES = ['active', 'inactive']
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/
const SAFE_FIELDS = '-password -refreshToken -loginAttempts -lockUntil'

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'SuperAdmin access required' })
  }
  next()
}

// GET /api/users
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find().select(SAFE_FIELDS).sort({ createdAt: -1 })
    res.json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/users  (superadmin only)
router.post('/', protect, requireSuperAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(PASSWORD_REGEX).withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('role').optional().isIn(VALID_ROLES).withMessage('Invalid role'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { name, email, password, phone, role, status } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' })
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || undefined,
      role: role || 'viewer',
      status: status || 'active',
    })
    await logAction(req.user.id, 'CREATE', 'User', user._id.toString(), user.name)
    const safeUser = await User.findById(user._id).select(SAFE_FIELDS)
    res.status(201).json({ success: true, data: safeUser })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/users/:id
router.put('/:id', protect, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('role').optional().isIn(VALID_ROLES).withMessage('Invalid role'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { name, email, phone, role, status } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone || undefined
    if (role !== undefined) updates.role = role
    if (status !== undefined) updates.status = status

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select(SAFE_FIELDS)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await logAction(req.user.id, 'UPDATE', 'User', req.params.id, user.name)
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/users/:id  (superadmin only)
router.delete('/:id', protect, requireSuperAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' })
    }
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await logAction(req.user.id, 'DELETE', 'User', req.params.id, user.name)
    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
