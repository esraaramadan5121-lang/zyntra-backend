const cron = require('node-cron')
const Blog = require('../models/Blog')
const AuditLog = require('../models/AuditLog')

// Run every minute: publish any articles whose scheduledAt has passed
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date()
    const due = await Blog.find({ status: 'scheduled', scheduledAt: { $lte: now } })
    for (const post of due) {
      post.status = 'published'
      post.publishedAt = now
      post.scheduledAt = null
      await post.save()
      await AuditLog.create({
        userId:   post.authorId || undefined,
        action:   'AUTO_PUBLISH',
        entity:   'Blog',
        entityId: post._id.toString(),
        details:  `Scheduled auto-publish: "${post.title}"`,
      }).catch(() => {})
    }
    if (due.length) console.log(`[Scheduler] Auto-published ${due.length} article(s)`)
  } catch (err) {
    console.error('[Scheduler] Error:', err.message)
  }
})

console.log('[Scheduler] Running — checks every minute for scheduled articles')
