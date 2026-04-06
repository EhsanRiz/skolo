const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const supabase = require('../lib/supabase')

// All routes require parent auth
router.use(auth)

// Middleware: ensure parent role
router.use((req, res, next) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: 'Parent access only' })
  next()
})

// GET /parent-data/dashboard — parent home data
router.get('/dashboard', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, logo_url, phone, email, country_id, countries(currency_symbol, currency_code)')
      .eq('id', school_id)
      .single()

    // Get guardian info
    const { data: guardian } = await supabase
      .from('guardians')
      .select('id, first_name, last_name, phone, email')
      .eq('id', guardian_id)
      .single()

    // Get linked learners
    const { data: links } = await supabase
      .from('learner_guardians')
      .select('learner_id, is_primary')
      .eq('guardian_id', guardian_id)

    const learnerIds = (links || []).map(l => l.learner_id)
    let learners = []

    if (learnerIds.length > 0) {
      const { data } = await supabase
        .from('learners')
        .select('id, first_name, last_name, date_of_birth, gender, reference_no, is_active, class_id, classes(id, name, grade_id, grades(id, name))')
        .in('id', learnerIds)
        .eq('is_active', true)

      learners = data || []
    }

    // Fee summary per learner
    const currentYear = new Date().getFullYear()
    for (const learner of learners) {
      const { data: fees } = await supabase
        .from('fee_ledger')
        .select('amount_due, amount_paid, due_date, status')
        .eq('learner_id', learner.id)
        .eq('school_id', school_id)
        .gte('due_date', `${currentYear}-01-01`)
        .lte('due_date', `${currentYear}-12-31`)

      const feeEntries = fees || []
      const total_due = feeEntries.reduce((s, f) => s + parseFloat(f.amount_due || 0), 0)
      const total_paid = feeEntries.reduce((s, f) => s + parseFloat(f.amount_paid || 0), 0)
      const overdue = feeEntries.filter(f => {
        const isPast = new Date(f.due_date) < new Date()
        const unpaid = parseFloat(f.amount_paid || 0) < parseFloat(f.amount_due || 0)
        return isPast && unpaid
      }).length

      learner.fee_summary = {
        total_due: total_due.toFixed(2),
        total_paid: total_paid.toFixed(2),
        balance: (total_due - total_paid).toFixed(2),
        overdue
      }
    }

    // Unread messages count
    const { count: unreadMessages } = await supabase
      .from('conversation_participants')
      .select('conversation_id', { count: 'exact' })
      .eq('user_id', req.user.id)

    // Get recent announcements (last 5)
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, body, target, created_at')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Upcoming events (next 5)
    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabase
      .from('events')
      .select('id, title, description, event_date, end_date, event_type')
      .eq('school_id', school_id)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5)

    res.json({
      school,
      guardian,
      learners,
      unread_messages: unreadMessages || 0,
      announcements: announcements || [],
      events: events || []
    })
  } catch (err) {
    console.error('Parent dashboard error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/children — detailed learner list
router.get('/children', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user

    const { data: links } = await supabase
      .from('learner_guardians')
      .select('learner_id')
      .eq('guardian_id', guardian_id)

    const learnerIds = (links || []).map(l => l.learner_id)
    if (learnerIds.length === 0) return res.json({ learners: [] })

    const { data: learners } = await supabase
      .from('learners')
      .select('id, first_name, last_name, date_of_birth, gender, reference_no, is_active, class_id, classes(id, name, grade_id, grades(id, name))')
      .in('id', learnerIds)
      .eq('is_active', true)

    res.json({ learners: learners || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/fees — fee ledger for parent's children
router.get('/fees', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const year = req.query.year || new Date().getFullYear()

    const { data: links } = await supabase
      .from('learner_guardians')
      .select('learner_id')
      .eq('guardian_id', guardian_id)

    const learnerIds = (links || []).map(l => l.learner_id)
    if (learnerIds.length === 0) return res.json({ learners: [] })

    // Get learners with names
    const { data: learners } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no, class_id, classes(name, grades(name))')
      .in('id', learnerIds)
      .eq('is_active', true)

    // Get fee entries for each learner
    for (const learner of (learners || [])) {
      const { data: fees } = await supabase
        .from('fee_ledger')
        .select('id, description, amount_due, amount_paid, due_date, status, created_at')
        .eq('learner_id', learner.id)
        .eq('school_id', school_id)
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`)
        .order('due_date', { ascending: true })

      const entries = fees || []
      const total_due = entries.reduce((s, f) => s + parseFloat(f.amount_due || 0), 0)
      const total_paid = entries.reduce((s, f) => s + parseFloat(f.amount_paid || 0), 0)

      learner.fees = entries
      learner.fee_summary = {
        total_due: total_due.toFixed(2),
        total_paid: total_paid.toFixed(2),
        balance: (total_due - total_paid).toFixed(2)
      }
    }

    // Get school currency
    const { data: school } = await supabase
      .from('schools')
      .select('countries(currency_symbol, currency_code)')
      .eq('id', school_id)
      .single()

    res.json({ learners: learners || [], currency: school?.countries })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/attendance — attendance for parent's children
router.get('/attendance', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const year = req.query.year || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth() + 1)

    const { data: links } = await supabase
      .from('learner_guardians')
      .select('learner_id')
      .eq('guardian_id', guardian_id)

    const learnerIds = (links || []).map(l => l.learner_id)
    if (learnerIds.length === 0) return res.json({ learners: [] })

    const { data: learners } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no, class_id, classes(name, grades(name))')
      .in('id', learnerIds)
      .eq('is_active', true)

    // Get attendance for each learner for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

    for (const learner of (learners || [])) {
      const { data: records } = await supabase
        .from('attendance')
        .select('id, attend_date, status')
        .eq('learner_id', learner.id)
        .eq('school_id', school_id)
        .gte('attend_date', startDate)
        .lte('attend_date', endDate)
        .order('attend_date', { ascending: true })

      const entries = records || []
      const total = entries.length
      const present = entries.filter(r => r.status === 'present').length
      const absent = entries.filter(r => r.status === 'absent').length
      const late = entries.filter(r => r.status === 'late').length
      const excused = entries.filter(r => r.status === 'excused').length

      learner.attendance = {
        records: entries,
        summary: {
          total_days: total,
          present,
          absent,
          late,
          excused,
          percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0
        }
      }
    }

    res.json({ learners: learners || [], year: parseInt(year), month: parseInt(month) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/announcements — school announcements relevant to parent
router.get('/announcements', async (req, res) => {
  try {
    const { school_id, guardian_id } = req.user
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit

    // Get all announcements (all target + those targeting learner's classes/grades)
    const { data: links } = await supabase
      .from('learner_guardians')
      .select('learner_id')
      .eq('guardian_id', guardian_id)

    const learnerIds = (links || []).map(l => l.learner_id)

    // Get learner class IDs for targeted announcements
    let classIds = []
    let gradeIds = []
    if (learnerIds.length > 0) {
      const { data: learners } = await supabase
        .from('learners')
        .select('class_id, classes(grade_id)')
        .in('id', learnerIds)
      classIds = (learners || []).map(l => l.class_id).filter(Boolean)
      gradeIds = (learners || []).map(l => l.classes?.grade_id).filter(Boolean)
    }

    // Fetch all school-wide + targeted announcements
    let query = supabase
      .from('announcements')
      .select('id, title, body, target, target_id, created_at, users(full_name)', { count: 'exact' })
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: announcements, count } = await query

    // Filter: show 'all' target + matching class/grade
    const filtered = (announcements || []).filter(a => {
      if (a.target === 'all') return true
      if (a.target === 'class' && classIds.includes(a.target_id)) return true
      if (a.target === 'grade' && gradeIds.includes(a.target_id)) return true
      return false
    })

    res.json({ announcements: filtered, total: count, page })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/events — school events
router.get('/events', async (req, res) => {
  try {
    const { school_id } = req.user
    const from = req.query.from || new Date().toISOString().split('T')[0]

    const { data: events } = await supabase
      .from('events')
      .select('id, title, description, event_date, end_date, event_type, created_at')
      .eq('school_id', school_id)
      .gte('event_date', from)
      .order('event_date', { ascending: true })
      .limit(50)

    res.json({ events: events || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
