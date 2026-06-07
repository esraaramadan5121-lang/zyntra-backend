const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const helmet = require('helmet')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const connectDB = require('./config/db')
const requestLogger = require('./middleware/requestLogger')

dotenv.config()
connectDB()

const app = express()

// Security headers
app.use(helmet({
  frameguard:       { action: 'deny' },
  noSniff:          true,
  xssFilter:        true,
  hidePoweredBy:    true,
  hsts:             { maxAge: 31536000, includeSubDomains: true },
}))

// Attach unique request ID to every response for traceability
app.use((req, res, next) => {
  req.id = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
})

// Global rate limit: 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}))

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://zyntra.ltd',
    'https://www.zyntra.ltd',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.options('*', cors())
app.use(express.json({ limit: '10kb' }))
app.use(requestLogger)

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ success: true, message: 'ZYNTRA API Running' }))

app.use('/api/auth',       require('./routes/auth'))
app.use('/api/services',   require('./routes/services'))
app.use('/api/projects',   require('./routes/projects'))
app.use('/api/blog',       require('./routes/blog'))
app.use('/api/messages',   require('./routes/messages'))
app.use('/api/audit-logs', require('./routes/auditLogs'))
app.use('/api/upload',     require('./routes/upload'))
app.use('/api/careers',    require('./routes/careers'))
app.use('/api/search',     require('./routes/search'))
app.use('/api/settings',   require('./routes/settings'))

// CRM namespace — contacts, deals, pipeline all under /api/crm
app.use('/api/crm', require('./routes/crm'))

// ─── Error handlers ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] [${req.id}] ${err.stack || err.message}`)
  const status = err.statusCode || err.status || 500
  // Hide implementation details from clients in production
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error'
  res.status(status).json({ success: false, message })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
