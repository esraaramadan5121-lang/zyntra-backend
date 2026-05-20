const express = require('express')
const dotenv = require('dotenv')
const connectDB = require('./config/db')
const cors = require('cors')

dotenv.config()
connectDB()

const app = express()

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://zyntra-project.vercel.app',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json())

const authRouter = require('./routes/auth')
const servicesRouter = require('./routes/services')
const projectsRouter = require('./routes/projects')
const blogRouter = require('./routes/blog')
const messagesRouter = require('./routes/messages')
const auditLogsRouter = require('./routes/auditLogs')

app.get('/', (req, res) => res.json({ message: '🚀 ZYNTRA API Running' }))
app.use('/api/auth', authRouter)
app.use('/api/services', servicesRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/blog', blogRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/audit-logs', auditLogsRouter)
app.use('/api/upload', require('./routes/upload'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))