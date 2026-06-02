const router = require('express').Router()
const Pipeline = require('../models/Pipeline')
const Deal = require('../models/Deal')
const { protect } = require('../middleware/auth')

// GET /api/crm/pipeline
// Returns stage configuration + live deal counts and values per stage
router.get('/', protect, async (req, res) => {
  try {
    let pipeline = await Pipeline.findOne()
    if (!pipeline) pipeline = await Pipeline.create({ name: 'Default' })

    const dealStats = await Deal.aggregate([
      {
        $group: {
          _id: '$stage',
          count:      { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ])

    const statsMap = Object.fromEntries(dealStats.map((s) => [s._id, s]))

    const stages = pipeline.stages.map((s) => ({
      key:          s.key,
      label:        s.label,
      order:        s.order,
      color:        s.color,
      probability:  s.probability,
      dealCount:    statsMap[s.key]?.count      ?? 0,
      totalValue:   statsMap[s.key]?.totalValue ?? 0,
    }))

    const summary = {
      totalDeals: dealStats.reduce((a, s) => a + s.count, 0),
      totalValue: dealStats.reduce((a, s) => a + s.totalValue, 0),
    }

    res.json({ success: true, data: { name: pipeline.name, stages, summary } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
