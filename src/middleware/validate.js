const { validationResult } = require('express-validator')

const handleValidation = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() })
    return true
  }
  return false
}

module.exports = { handleValidation }
