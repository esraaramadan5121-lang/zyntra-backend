const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' })
    const user = await User.create({ name, email, password })
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router