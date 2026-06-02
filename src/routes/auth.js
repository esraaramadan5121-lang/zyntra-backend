const router = require('express').Router()
const jwt = require('jsonwebtoken')
const { body } = require('express-validator')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const { protect } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

// Min 12 chars, uppercase, lowercase, digit, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/

const passwordValidators = [
  body('password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(PASSWORD_REGEX).withMessage('Password must contain uppercase, lowercase, number, and special character'),
]

const newPasswordValidators = [
  body('newPassword')
    .isLength({ min: 12 }).withMessage('New password must be at least 12 characters')
    .matches(PASSWORD_REGEX).withMessage('New password must contain uppercase, lowercase, number, and special character'),
]

// Brute-force protection specific to the login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
})

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' })

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  )

const logLoginAttempt = async (userId, success, ip, details = '') => {
  try {
    await AuditLog.create({
      userId: userId || undefined,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      entity: 'User',
      entityId: userId ? String(userId) : '',
      details: `IP: ${ip}${details ? ' | ' + details : ''}`,
    })
  } catch {}
}

// Protected: only an existing admin can register new admin accounts.
// Use seed.js for the first admin.
router.post('/register', protect, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  ...passwordValidators,
], async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { name, email, password } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' })
    const user = await User.create({ name, email, password })
    const token = generateAccessToken(user)
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  if (handleValidation(req, res)) return
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      await logLoginAttempt(null, false, ip, `Email not found: ${email}`)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    if (user.isLocked()) {
      await logLoginAttempt(user._id, false, ip, 'Account locked')
      const remainingMin = Math.ceil((user.lockUntil - Date.now()) / 60000)
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingMin} minute(s).`,
      })
    }

    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      await user.incrementLoginAttempts()
      const newAttempts = user.loginAttempts + 1
      await logLoginAttempt(user._id, false, ip, `Failed attempt ${newAttempts}`)
      const attemptsLeft = 5 - newAttempts
      const message = attemptsLeft <= 0
        ? 'Account locked for 30 minutes due to too many failed attempts.'
        : `Invalid credentials. ${attemptsLeft} attempt(s) remaining before lockout.`
      return res.status(401).json({ success: false, message })
    }

    await user.resetLoginAttempts()
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    // Store hashed refresh token lookup via direct update to avoid re-hashing password
    await User.findByIdAndUpdate(user._id, { refreshToken })
    await logLoginAttempt(user._id, true, ip)

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' })
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    )
    const user = await User.findOne({ _id: decoded.id, refreshToken })
    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' })

    const accessToken = generateAccessToken(user)
    // Rotate refresh token on each use
    const newRefreshToken = generateRefreshToken(user)
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken })

    res.json({ success: true, token: accessToken, refreshToken: newRefreshToken })
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' })
  }
})

router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } })
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  ...newPasswordValidators,
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

    res.json({ success: true, message: 'Password changed. Please log in again with your new password.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
