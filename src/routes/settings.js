const router = require('express').Router()
const { body } = require('express-validator')
const User = require('../models/User')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/

const PROFILE_FIELDS = [
  'name', 'phone',
  'companyName', 'companyEmail', 'companyPhone',
  'companyAddress', 'companyLogo', 'companyWebsite',
]

// GET /api/settings — current admin profile + company info
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'name email phone companyName companyEmail companyPhone companyAddress companyLogo companyWebsite role createdAt updatedAt'
    )
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/settings — update admin profile and company info
router.put('/', protect, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
  body('phone').optional().trim(),
  body('companyName').optional().trim(),
  body('companyEmail').optional().trim().isEmail().withMessage('Invalid company email'),
  body('companyPhone').optional().trim(),
  body('companyAddress').optional().trim(),
  body('companyLogo').optional().trim().isURL().withMessage('Invalid logo URL'),
  body('companyWebsite').optional().trim().isURL().withMessage('Invalid website URL'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const update = {}
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) update[field] = req.body[field]
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('name email phone companyName companyEmail companyPhone companyAddress companyLogo companyWebsite role updatedAt')

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await logAction(req.user.id, 'update', 'User', req.user.id, 'admin profile settings')
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/settings/password — change password
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 12 }).withMessage('New password must be at least 12 characters')
    .matches(PASSWORD_REGEX).withMessage('New password must contain uppercase, lowercase, number, and special character'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const match = await user.comparePassword(req.body.currentPassword)
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' })

    user.password = req.body.newPassword
    user.refreshToken = undefined
    await user.save()

    await logAction(req.user.id, 'update', 'User', req.user.id, 'password changed')
    res.json({ success: true, message: 'Password changed. Please log in again with your new password.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/settings/contact — update email and/or phone
router.put('/contact', protect, [
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be blank'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { email, phone } = req.body
    const update = {}
    if (email !== undefined) update.email = email
    if (phone !== undefined) update.phone = phone

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } })
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' })
    }
    if (phone) {
      const existing = await User.findOne({ phone, _id: { $ne: req.user.id } })
      if (existing) return res.status(400).json({ success: false, message: 'Phone number already in use' })
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('name email phone updatedAt')

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await logAction(req.user.id, 'update', 'User', req.user.id, 'contact info updated')
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
