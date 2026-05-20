const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();

// ✅ Middleware
app.use(express.json());

// ✅ إعداد CORS الصحيح
app.use(cors({
  origin: [
    "http://localhost:3000",                // أثناء التطوير المحلي
    "https://zyntra.vercel.app"     // رابط الفرونت إند على Vercel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ معالجة طلبات preflight (OPTIONS)
app.options('*', cors());

// ✅ Routes
const authRouter = require('./routes/auth');
const servicesRouter = require('./routes/services');
const projectsRouter = require('./routes/projects');
const blogRouter = require('./routes/blog');
const messagesRouter = require('./routes/messages');
const auditLogsRouter = require('./routes/auditLogs');

app.get('/', (req, res) => res.json({ message: '🚀 ZYNTRA API Running' }));
app.use('/api/auth', authRouter);
app.use('/api/services', servicesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/blog', blogRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/upload', require('./routes/upload'));

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
