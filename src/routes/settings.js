const router = require('express').Router()
const { body } = require('express-validator')
const Settings = require('../models/Settings')
const { protect, logAction } = require('../middleware/auth')
const { handleValidation } = require('../middleware/validate')

const DEFAULTS = {
  siteName:     'ZYNTRA Digital',
  contactEmail: 'info@zyntra.ltd',
  phoneNumber:  '+20 100 000 0000',
  address:      'Cairo, Egypt',
}

const settingsValidation = [
  body('siteName').optional().trim().notEmpty().withMessage('siteName cannot be blank'),
  body('contactEmail').optional().trim().isEmail().withMessage('Invalid email'),
  body('phoneNumber').optional().trim().notEmpty().withMessage('phoneNumber cannot be blank'),
  body('address').optional().trim().notEmpty().withMessage('address cannot be blank'),
]

// Public — returns the single settings document (or defaults if none exists yet)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      return res.json({ success: true, data: DEFAULTS })
    }
    res.json({ success: true, data: settings })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Protected — upsert the single settings document
router.put('/', protect, settingsValidation, async (req, res) => {
  if (handleValidation(req, res)) return
  try {
    const { siteName, contactEmail, phoneNumber, address } = req.body
    const update = {}
    if (siteName     !== undefined) update.siteName     = siteName
    if (contactEmail !== undefined) update.contactEmail = contactEmail
    if (phoneNumber  !== undefined) update.phoneNumber  = phoneNumber
    if (address      !== undefined) update.address      = address

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    )
    await logAction(req.user.id, 'update', 'Settings', settings._id.toString(), 'site settings')
    res.json({ success: true, data: settings })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
