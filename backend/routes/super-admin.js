const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const supabase = require('../lib/supabase')
const superAuth = require('../middleware/superAdmin')
const { sendSchoolInviteEmail } = require('../lib/email')

const router = express.Router()

// ═══════════════════════════════════════════════════════════
// PUBLIC — Super-admin login
// ═══════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const { data: admin, error } = await supabase
      .from('platform_admins')
      .select('id, email, full_name, password_hash, is_active')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' })
    if (!admin.is_active)  return res.status(403).json({ error: 'Account disabled' })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: admin.id, email: admin.email, full_name: admin.full_name, platform_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, admin: { id: admin.id, email: admin.email, full_name: admin.full_name } })
  } catch (err) {
    console.error('super-admin login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ═══════════════════════════════════════════════════════════
// PROTECTED — Everything below requires super-admin JWT
// ═══════════════════════════════════════════════════════════
router.use(superAuth)

// ─── GET /super-admin/overview ─────────────────────────────
// Top-level platform KPIs
router.get('/overview', async (req, res) => {
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10)
    const sevenDaysAgo  = new Date(now - 7  * 86400000).toISOString().slice(0, 10)

    const [
      schoolsRes,
      usersRes,
      learnersRes,
      loginsRecentRes,
      loginsWeekRes,
    ] = await Promise.all([
      supabase.from('schools').select('id, name, country_id, subscription_status, subscription_plan, created_at, countries(name, currency_symbol)').order('created_at', { ascending: false }),
      supabase.from('users').select('id, school_id, role, email, full_name, is_active, created_at, password_set'),
      supabase.from('learners').select('id, school_id, is_active'),
      supabase.from('login_logs').select('id, school_id, user_id, logged_in_at').gte('logged_in_at', thirtyDaysAgo).order('logged_in_at', { ascending: false }),
      supabase.from('login_logs').select('id').gte('logged_in_at', sevenDaysAgo),
    ])

    const schools  = schoolsRes.data || []
    const users    = usersRes.data || []
    const learners = learnersRes.data || []
    const recentLogins = loginsRecentRes.data || []
    const weekLogins   = loginsWeekRes.data || []

    // Schools summary
    const totalSchools  = schools.length
    const activeSchools = new Set(recentLogins.map(l => l.school_id)).size
    const trialSchools  = schools.filter(s => s.subscription_status === 'trial').length

    // Users summary
    const totalUsers  = users.length
    const activeUsers = users.filter(u => u.is_active).length
    const byRole      = {}
    users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1 })

    // Learners
    const totalLearners  = learners.length
    const activeLearners = learners.filter(l => l.is_active).length

    // Logins
    const uniqueLoginsWeek  = new Set(weekLogins.map(l => l.id)).size
    const uniqueLoginsMonth = recentLogins.length

    // Schools with details
    const schoolDetails = schools.map(s => {
      const schoolUsers    = users.filter(u => u.school_id === s.id)
      const schoolLearners = learners.filter(l => l.school_id === s.id && l.is_active)
      const schoolLogins   = recentLogins.filter(l => l.school_id === s.id)
      const lastLogin      = schoolLogins.length > 0 ? schoolLogins[0].logged_in_at : null
      return {
        id: s.id,
        name: s.name,
        country: s.countries?.name || 'Unknown',
        currency: s.countries?.currency_symbol || 'M',
        subscription_status: s.subscription_status || 'trial',
        subscription_plan: s.subscription_plan || 'free',
        created_at: s.created_at,
        userCount: schoolUsers.length,
        learnerCount: schoolLearners.length,
        loginCount30d: schoolLogins.length,
        lastLogin,
      }
    })

    res.json({
      totalSchools,
      activeSchools,
      trialSchools,
      totalUsers,
      activeUsers,
      usersByRole: byRole,
      totalLearners,
      activeLearners,
      loginsThisWeek: uniqueLoginsWeek,
      loginsThisMonth: uniqueLoginsMonth,
      schools: schoolDetails,
    })
  } catch (err) {
    console.error('super-admin overview error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /super-admin/logins ───────────────────────────────
// Recent login feed with user + school info
router.get('/logins', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const days  = parseInt(req.query.days)  || 30
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: logs, error } = await supabase
      .from('login_logs')
      .select('id, user_id, school_id, ip_address, user_agent, logged_in_at, users(full_name, email, role), schools(name)')
      .gte('logged_in_at', since)
      .order('logged_in_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const rows = (logs || []).map(l => ({
      id: l.id,
      user_name: l.users?.full_name || 'Unknown',
      user_email: l.users?.email || '',
      user_role: l.users?.role || '',
      school_name: l.schools?.name || 'Unknown',
      school_id: l.school_id,
      ip_address: l.ip_address,
      user_agent: l.user_agent,
      logged_in_at: l.logged_in_at,
    }))

    res.json({ logins: rows })
  } catch (err) {
    console.error('super-admin logins error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /super-admin/activity ─────────────────────────────
// Activity feed across all schools
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const days  = parseInt(req.query.days)  || 7
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('id, school_id, user_id, action, entity_type, metadata, created_at, users(full_name, email), schools(name)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const rows = (logs || []).map(l => ({
      id: l.id,
      action: l.action,
      entity_type: l.entity_type,
      metadata: l.metadata,
      user_name: l.users?.full_name || 'System',
      user_email: l.users?.email || '',
      school_name: l.schools?.name || 'Unknown',
      school_id: l.school_id,
      created_at: l.created_at,
    }))

    res.json({ activities: rows })
  } catch (err) {
    console.error('super-admin activity error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /super-admin/school/:id ───────────────────────────
// Detailed view of a single school
router.get('/school/:id', async (req, res) => {
  try {
    const schoolId = req.params.id

    const [schoolRes, usersRes, learnersRes, feesRes, attendanceRes, loginsRes, activityRes] = await Promise.all([
      supabase.from('schools').select('*, countries(name, currency_symbol, currency_code)').eq('id', schoolId).single(),
      supabase.from('users').select('id, full_name, email, role, is_active, created_at, password_set').eq('school_id', schoolId),
      supabase.from('learners').select('id, is_active, created_at').eq('school_id', schoolId),
      supabase.from('fee_ledger').select('amount_due, amount_paid, amount_waived, due_date, status').eq('school_id', schoolId),
      supabase.from('attendance').select('id, status, date').eq('school_id', schoolId),
      supabase.from('login_logs').select('id, user_id, logged_in_at, users(full_name, role)').eq('school_id', schoolId).order('logged_in_at', { ascending: false }).limit(50),
      supabase.from('activity_logs').select('id, action, entity_type, metadata, created_at, users(full_name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(50),
    ])

    const school   = schoolRes.data
    const users    = usersRes.data || []
    const learners = learnersRes.data || []
    const fees     = feesRes.data || []
    const att      = attendanceRes.data || []
    const logins   = loginsRes.data || []
    const activity = activityRes.data || []

    if (!school) return res.status(404).json({ error: 'School not found' })

    // Fee stats
    const totalDue  = fees.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPaid = fees.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
    const totalWaived = fees.reduce((s, r) => s + Number(r.amount_waived || 0), 0)
    const collectionRate = totalDue > 0 ? Math.round(totalPaid / totalDue * 100) : 0

    // Attendance stats
    const attPresent = att.filter(a => a.status === 'present' || a.status === 'late').length
    const attTotal   = att.length
    const attRate    = attTotal > 0 ? Math.round(attPresent / attTotal * 100) : null

    // Exam grades count
    const { count: examCount } = await supabase
      .from('exam_results')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)

    res.json({
      school: {
        id: school.id,
        name: school.name,
        country: school.countries?.name,
        currency: school.countries?.currency_symbol || 'M',
        email: school.email,
        phone: school.phone,
        subscription_status: school.subscription_status,
        subscription_plan: school.subscription_plan,
        created_at: school.created_at,
      },
      stats: {
        users: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        learners: learners.length,
        activeLearners: learners.filter(l => l.is_active).length,
        totalDue, totalPaid, totalWaived, collectionRate,
        attendanceRate: attRate,
        attendanceRecords: attTotal,
        examGrades: examCount || 0,
      },
      users: users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active, password_set: u.password_set, created_at: u.created_at })),
      recentLogins: logins.map(l => ({ id: l.id, user_name: l.users?.full_name, user_role: l.users?.role, logged_in_at: l.logged_in_at })),
      recentActivity: activity.map(a => ({ id: a.id, action: a.action, entity_type: a.entity_type, metadata: a.metadata, user_name: a.users?.full_name, created_at: a.created_at })),
    })
  } catch (err) {
    console.error('super-admin school detail error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /super-admin/usage-stats ──────────────────────────
// Aggregate usage across the platform
router.get('/usage-stats', async (req, res) => {
  try {
    const [feesRes, attRes, examsRes, learnersRes] = await Promise.all([
      supabase.from('fee_ledger').select('id, school_id, amount_due, amount_paid', { count: 'exact' }),
      supabase.from('attendance').select('id, school_id', { count: 'exact' }),
      supabase.from('exam_results').select('id, school_id', { count: 'exact' }),
      supabase.from('learners').select('id, school_id, created_at').eq('is_active', true),
    ])

    const fees     = feesRes.data || []
    const att      = attRes.data || []
    const exams    = examsRes.data || []
    const learners = learnersRes.data || []

    // Per-school usage
    const schoolUsage = {}
    const addUsage = (schoolId, key, val = 1) => {
      if (!schoolUsage[schoolId]) schoolUsage[schoolId] = { fees: 0, attendance: 0, exams: 0, learners: 0, feeAmount: 0 }
      schoolUsage[schoolId][key] += val
    }

    fees.forEach(f => { addUsage(f.school_id, 'fees'); addUsage(f.school_id, 'feeAmount', Number(f.amount_paid || 0)) })
    att.forEach(a => addUsage(a.school_id, 'attendance'))
    exams.forEach(e => addUsage(e.school_id, 'exams'))
    learners.forEach(l => addUsage(l.school_id, 'learners'))

    res.json({
      totals: {
        feeEntries: feesRes.count || fees.length,
        attendanceRecords: attRes.count || att.length,
        examGrades: examsRes.count || exams.length,
        activeLearners: learners.length,
        totalCollected: fees.reduce((s, f) => s + Number(f.amount_paid || 0), 0),
      },
      bySchool: schoolUsage,
    })
  } catch (err) {
    console.error('super-admin usage-stats error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /super-admin/invite-school ──────────────────────
// Send an invite to a new school admin to register
router.post('/invite-school', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const cleanEmail = email.toLowerCase().trim()

    // Check if this email already has a pending (unused, non-expired) invite
    const { data: existing } = await supabase
      .from('school_invites')
      .select('id, expires_at, used')
      .eq('email', cleanEmail)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'An active invite already exists for this email' })
    }

    // Check if this email is already registered as a school admin
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .eq('role', 'admin')
      .maybeSingle()

    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered as a school admin' })
    }

    // Generate token and create invite
    const token = crypto.randomBytes(32).toString('hex')
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { data: invite, error: insertErr } = await supabase
      .from('school_invites')
      .insert({
        email: cleanEmail,
        token,
        invited_by: req.admin.id,
        expires_at,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Send invite email
    const frontendUrl = process.env.FRONTEND_URL || 'https://myskolo.co.za'
    const registerUrl = `${frontendUrl}/register?token=${token}`

    await sendSchoolInviteEmail({
      to: cleanEmail,
      registerUrl,
      expiresIn: '7 days',
    })

    res.status(201).json({ invite: { id: invite.id, email: cleanEmail, expires_at, sent: true } })
  } catch (err) {
    console.error('invite-school error:', err)
    res.status(500).json({ error: err.message || 'Failed to send invite' })
  }
})

// ─── GET /super-admin/invites ─────────────────────────────
// List all school invites
router.get('/invites', async (req, res) => {
  try {
    const { data: invites, error } = await supabase
      .from('school_invites')
      .select('id, email, used, used_at, school_id, expires_at, created_at, schools(name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const rows = (invites || []).map(i => ({
      id: i.id,
      email: i.email,
      used: i.used,
      used_at: i.used_at,
      school_name: i.schools?.name || null,
      expires_at: i.expires_at,
      created_at: i.created_at,
      status: i.used ? 'registered' : new Date(i.expires_at) < new Date() ? 'expired' : 'pending',
    }))

    res.json({ invites: rows })
  } catch (err) {
    console.error('list invites error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
