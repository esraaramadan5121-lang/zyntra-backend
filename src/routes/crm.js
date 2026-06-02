const router = require('express').Router()

router.use('/contacts', require('./contacts'))
router.use('/deals',    require('./deals'))
router.use('/pipeline', require('./pipeline'))

module.exports = router
