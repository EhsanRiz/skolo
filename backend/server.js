require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'skolo-api' }))

// ─── Routes ───────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'))
app.use('/schools',       require('./routes/schools'))
app.use('/learners',      require('./routes/learners'))
app.use('/fees',          require('./routes/fees'))
app.use('/events',        require('./routes/events'))
app.use('/announcements', require('./routes/announcements'))

// ─── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Skolo API running on port ${PORT}`))
