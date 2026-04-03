require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

// ─── Middleware ───────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true)
    // Allow any skolo.pages.dev subdomain
    if (origin.endsWith('.skolo.pages.dev') || origin.endsWith('.skolo.app')) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
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
app.use('/grades',        require('./routes/grades'))
app.use('/users',         require('./routes/users'))
app.use('/upload',        require('./routes/upload'))
app.use('/portal',        require('./routes/portal'))
app.use('/fee-plans',     require('./routes/fee-plans'))
app.use('/fee-ledger',    require('./routes/fee-ledger'))
app.use('/teachers',      require('./routes/teachers'))

// ─── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Skolo API running on port ${PORT}`))
// Added dynamically — fee plans, fee ledger, teachers
