const express = require('express')
const bcrypt = require('bcryptjs')
const PDFDoc = require('pdfkit')
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

    // Attendance per learner for current month
    const curMonth = new Date().getMonth() + 1
    const curYear = new Date().getFullYear()
    const mStart = `${curYear}-${String(curMonth).padStart(2, '0')}-01`
    const mEnd = new Date(curYear, curMonth, 0).toISOString().split('T')[0]

    for (const learner of learners) {
      const { data: att } = await supabase
        .from('attendance').select('status')
        .eq('learner_id', learner.id).eq('school_id', school_id)
        .gte('attend_date', mStart).lte('attend_date', mEnd)
      const recs = att || []
      const total = recs.length
      const present = recs.filter(r => r.status === 'present').length
      const late = recs.filter(r => r.status === 'late').length
      const absent = recs.filter(r => r.status === 'absent').length
      const excused = recs.filter(r => r.status === 'excused').length
      learner.attendance = { total, present, late, absent, excused, rate: total > 0 ? Math.round(((present + late) / total) * 100) : null }

      // Latest term grades
      const { data: grades } = await supabase
        .from('exam_results').select('mark, term')
        .eq('learner_id', learner.id).eq('school_id', school_id).eq('year', curYear)
      if (grades?.length > 0) {
        const latestTerm = Math.max(...grades.map(g => g.term))
        const termMarks = grades.filter(g => g.term === latestTerm).map(g => g.mark).filter(m => m != null)
        learner.latest_grade = {
          term: latestTerm,
          average: termMarks.length > 0 ? Math.round(termMarks.reduce((a, b) => a + b, 0) / termMarks.length) : null,
          subject_count: termMarks.length
        }
      }
    }

    // Monthly fee breakdown for chart (current year)
    const monthlyFees = []
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let m = 0; m < 12; m++) {
      const ms = `${currentYear}-${String(m + 1).padStart(2, '0')}-01`
      const me = new Date(currentYear, m + 1, 0).toISOString().split('T')[0]
      let due = 0, paid = 0
      for (const learner of learners) {
        const { data: fees } = await supabase
          .from('fee_ledger').select('amount_due, amount_paid')
          .eq('learner_id', learner.id).eq('school_id', school_id)
          .gte('due_date', ms).lte('due_date', me)
        for (const f of (fees || [])) {
          due += parseFloat(f.amount_due || 0)
          paid += parseFloat(f.amount_paid || 0)
        }
      }
      if (due > 0 || paid > 0) monthlyFees.push({ month: MONTHS[m], due: Math.round(due), paid: Math.round(paid) })
    }

    // Unread messages count
    let unreadMessages = 0
    try {
      const { data: msgData } = await supabase.rpc ? null : null
      // Simple approach: count via messaging endpoint logic
      const { data: parts } = await supabase
        .from('conversation_participants').select('conversation_id, last_read_at').eq('user_id', req.user.id)
      for (const p of (parts || [])) {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id).gt('created_at', p.last_read_at || '1970-01-01').neq('sender_id', req.user.id)
        unreadMessages += (count || 0)
      }
    } catch {}

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
      events: events || [],
      monthly_fees: monthlyFees
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

// GET /parent-data/notifications — aggregated notifications for parent
router.get('/notifications', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const items = []

    // Unread messages
    const { data: parts } = await supabase
      .from('conversation_participants').select('conversation_id, last_read_at').eq('user_id', req.user.id)
    let msgCount = 0
    for (const p of (parts || [])) {
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id).gt('created_at', p.last_read_at || '1970-01-01').neq('sender_id', req.user.id)
      msgCount += (count || 0)
    }
    if (msgCount > 0) items.push({ type: 'message', title: `${msgCount} unread message${msgCount > 1 ? 's' : ''}`, body: 'Tap to view your conversations', link: '/messages', created_at: new Date().toISOString() })

    // Recent announcements (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: ann } = await supabase.from('announcements').select('id, title, created_at')
      .eq('school_id', school_id).gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(5)
    for (const a of (ann || [])) {
      items.push({ type: 'announcement', title: a.title, body: 'New school announcement', link: '/announcements', created_at: a.created_at })
    }

    // Overdue fees
    const learnerIds = await getParentLearnerIds(guardian_id)
    if (learnerIds.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      for (const lid of learnerIds) {
        const { count } = await supabase.from('fee_ledger').select('id', { count: 'exact', head: true })
          .eq('learner_id', lid).eq('school_id', school_id).lt('due_date', today).lt('amount_paid', supabase.raw ? 'amount_due' : '0')
        // Simpler: just check status
        const { data: overdue } = await supabase.from('fee_ledger').select('id')
          .eq('learner_id', lid).eq('school_id', school_id).eq('status', 'overdue').limit(1)
        if (overdue?.length > 0) {
          const { data: l } = await supabase.from('learners').select('first_name').eq('id', lid).single()
          items.push({ type: 'fee_overdue', title: `Overdue fees for ${l?.first_name || 'your child'}`, body: 'Tap to view fee details', link: '/fees', created_at: new Date().toISOString() })
        }
      }
    }

    res.json({ total_unread: items.length, items: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Helper: get parent's linked learner IDs ─────────────────
async function getParentLearnerIds(guardian_id) {
  const { data: links } = await supabase
    .from('learner_guardians').select('learner_id').eq('guardian_id', guardian_id)
  return (links || []).map(l => l.learner_id)
}

// ─── Helper: validate learner belongs to parent ───────────────
async function validateLearnerOwnership(guardian_id, learner_id) {
  const ids = await getParentLearnerIds(guardian_id)
  return ids.includes(learner_id)
}

// GET /parent-data/grades — exam results for parent's children
router.get('/grades', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const year = parseInt(req.query.year) || new Date().getFullYear()

    const learnerIds = await getParentLearnerIds(guardian_id)
    if (learnerIds.length === 0) return res.json({ learners: [] })

    const { data: learners } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no, class_id, classes(name, grades(name))')
      .in('id', learnerIds).eq('is_active', true)

    // Get school grade boundaries
    const { data: school } = await supabase
      .from('schools').select('grade_boundaries').eq('id', school_id).single()

    for (const learner of (learners || [])) {
      const { data: results } = await supabase
        .from('exam_results')
        .select('id, subject, mark, term, year')
        .eq('learner_id', learner.id).eq('school_id', school_id).eq('year', year)
        .order('subject')

      // Group by term
      const byTerm = {}
      for (const r of (results || [])) {
        if (!byTerm[r.term]) byTerm[r.term] = []
        byTerm[r.term].push(r)
      }

      // Calculate averages per term
      const terms = {}
      for (const [term, entries] of Object.entries(byTerm)) {
        const marks = entries.map(e => e.mark).filter(m => m != null)
        terms[term] = {
          results: entries,
          average: marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null,
          subject_count: entries.length
        }
      }

      learner.terms = terms
    }

    res.json({ learners: learners || [], year, grade_boundaries: school?.grade_boundaries })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /parent-data/report-card/:learner_id — PDF report card for parent's child
router.get('/report-card/:learner_id', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const learnerId = req.params.learner_id
    const { term, year } = req.query

    if (!term || !year) return res.status(400).json({ error: 'term and year required' })

    // Validate ownership
    const isOwner = await validateLearnerOwnership(guardian_id, learnerId)
    if (!isOwner) return res.status(403).json({ error: 'Not your child' })

    // Redirect to the report-cards route handler by making an internal-style call
    // We'll replicate the PDF generation inline (same as report-cards.js)
    const termNum = parseInt(term), yearNum = parseInt(year)

    const { data: learner } = await supabase
      .from('learners')
      .select('*, classes(name, grades(name)), schools(id, name, phone, email, address, logo_url, grade_boundaries, countries(currency_symbol))')
      .eq('id', learnerId).eq('school_id', school_id).single()

    if (!learner) return res.status(404).json({ error: 'Learner not found' })

    const { data: examResults } = await supabase
      .from('exam_results').select('subject, mark')
      .eq('learner_id', learnerId).eq('term', termNum).eq('year', yearNum).eq('school_id', school_id)

    // Attendance for term
    const termRanges = {
      1: { s: `${yearNum}-01-01`, e: `${yearNum}-03-31` },
      2: { s: `${yearNum}-04-01`, e: `${yearNum}-06-30` },
      3: { s: `${yearNum}-07-01`, e: `${yearNum}-09-30` },
      4: { s: `${yearNum}-10-01`, e: `${yearNum}-12-31` }
    }
    const range = termRanges[termNum]
    let attendance = { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 }
    if (range) {
      const { data: att } = await supabase.from('attendance').select('status')
        .eq('learner_id', learnerId).gte('attend_date', range.s).lte('attend_date', range.e)
      const recs = att || []
      attendance.total = recs.length
      attendance.present = recs.filter(r => r.status === 'present').length
      attendance.absent = recs.filter(r => r.status === 'absent').length
      attendance.late = recs.filter(r => r.status === 'late').length
      attendance.excused = recs.filter(r => r.status === 'excused').length
      attendance.rate = attendance.total > 0 ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : 0
    }

    const results = (examResults || []).sort((a, b) => a.subject.localeCompare(b.subject))
    const sch = learner.schools
    const gb = sch?.grade_boundaries
    const marks = results.map(r => r.mark)
    const avg = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0

    const getGrade = (mark) => {
      if (gb && Array.isArray(gb) && gb.length > 0) {
        for (const b of gb) { if (mark >= b.min) return b.grade }
        return 'F'
      }
      if (mark >= 80) return 'A'; if (mark >= 70) return 'B'; if (mark >= 60) return 'C'; if (mark >= 50) return 'D'; return 'F'
    }

    // Build PDF
    const doc = new PDFDoc({ size: 'A4', margin: 40 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="report-card-${learner.first_name}-${learner.last_name}.pdf"`)
    doc.pipe(res)

    const W = doc.page.width - 80, navy = '#0f2044', darkGrey = '#64748b', lightGrey = '#f1f5f9'

    // Header
    doc.fillColor(navy).fontSize(18).font('Helvetica-Bold').text(sch?.name || 'School', 50, 50)
    doc.fillColor(darkGrey).fontSize(9).font('Helvetica')
       .text([sch?.address, sch?.phone, sch?.email].filter(Boolean).join('  ·  '), 50, 75)

    // Title bar
    doc.rect(40, 100, W, 36).fill(navy)
    doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('REPORT CARD', 0, 107, { align: 'center', width: doc.page.width })

    // Learner info
    let y = 155
    const field = (label, val, x, yy) => {
      doc.fillColor(darkGrey).fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x, yy)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(val || '—', x, yy + 11)
    }
    field('Name', `${learner.first_name} ${learner.last_name}`, 50, y)
    field('Term / Year', `Term ${termNum} · ${yearNum}`, 300, y)
    y += 35
    field('Grade / Class', `${learner.classes?.grades?.name || ''} ${learner.classes?.name || ''}`, 50, y)
    field('Reference', learner.reference_no, 300, y)

    // Results table
    y += 50
    doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text('ACADEMIC RESULTS', 50, y)
    y += 20
    const cw = [W * 0.6, W * 0.2, W * 0.2]

    doc.rect(50, y, cw[0], 18).fill(navy)
    doc.rect(50 + cw[0], y, cw[1], 18).fill(navy)
    doc.rect(50 + cw[0] + cw[1], y, cw[2], 18).fill(navy)
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
    doc.text('Subject', 55, y + 4, { width: cw[0] - 10 })
    doc.text('Mark (%)', 55 + cw[0], y + 4, { width: cw[1] - 10, align: 'center' })
    doc.text('Grade', 55 + cw[0] + cw[1], y + 4, { width: cw[2] - 10, align: 'center' })
    y += 18

    results.forEach((r, i) => {
      doc.rect(50, y, W, 18).fill(i % 2 === 0 ? '#fff' : lightGrey)
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      doc.text(r.subject, 55, y + 4, { width: cw[0] - 10 })
      doc.text(String(r.mark), 55 + cw[0], y + 4, { width: cw[1] - 10, align: 'center' })
      doc.text(getGrade(r.mark), 55 + cw[0] + cw[1], y + 4, { width: cw[2] - 10, align: 'center' })
      y += 18
    })

    if (results.length > 0) {
      doc.rect(50, y, W, 18).fill(navy)
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
      doc.text('AVERAGE', 55, y + 4, { width: cw[0] - 10 })
      doc.text(String(avg), 55 + cw[0], y + 4, { width: cw[1] - 10, align: 'center' })
      doc.text(getGrade(avg), 55 + cw[0] + cw[1], y + 4, { width: cw[2] - 10, align: 'center' })
    }

    // Attendance
    y += 40
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('ATTENDANCE', 50, y)
    y += 18
    doc.fillColor(darkGrey).fontSize(9).font('Helvetica')
    doc.text(`Present: ${attendance.present}   Absent: ${attendance.absent}   Late: ${attendance.late}   Excused: ${attendance.excused}   Rate: ${attendance.rate}%`, 50, y)

    // Footer
    doc.fillColor(darkGrey).fontSize(7).font('Helvetica')
       .text('Generated by Skolo', 0, doc.page.height - 30, { align: 'center', width: doc.page.width })

    doc.end()
  } catch (err) {
    console.error('Parent report card error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-data/timetable/:learner_id — class timetable for parent's child
router.get('/timetable/:learner_id', async (req, res) => {
  try {
    const { guardian_id, school_id } = req.user
    const learnerId = req.params.learner_id

    const isOwner = await validateLearnerOwnership(guardian_id, learnerId)
    if (!isOwner) return res.status(403).json({ error: 'Not your child' })

    // Get learner's class
    const { data: learner } = await supabase
      .from('learners')
      .select('id, first_name, last_name, class_id, classes(id, name, grades(name))')
      .eq('id', learnerId).single()

    if (!learner?.class_id) return res.json({ learner, slots: [], periods: [] })

    // Get teacher_classes for this class
    const { data: tcs } = await supabase
      .from('teacher_classes')
      .select('id, subject, teachers(full_name)')
      .eq('class_id', learner.class_id).eq('school_id', school_id)

    const tcIds = (tcs || []).map(tc => tc.id)
    let slots = []
    if (tcIds.length > 0) {
      const { data } = await supabase
        .from('timetable')
        .select('id, teacher_class_id, day_of_week, period_number, room')
        .in('teacher_class_id', tcIds)
        .order('day_of_week').order('period_number')

      // Enrich slots with subject/teacher
      const tcMap = {}
      for (const tc of tcs) tcMap[tc.id] = tc
      slots = (data || []).map(s => ({
        ...s,
        subject: tcMap[s.teacher_class_id]?.subject,
        teacher: tcMap[s.teacher_class_id]?.teachers?.full_name
      }))
    }

    // Get school period config
    const { data: school } = await supabase
      .from('schools').select('periods').eq('id', school_id).single()

    res.json({ learner, slots, periods: school?.periods || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /parent-data/profile — update parent's guardian info
router.patch('/profile', async (req, res) => {
  try {
    const { guardian_id } = req.user
    const { first_name, last_name, phone, email } = req.body

    const updates = {}
    if (first_name) updates.first_name = first_name.trim()
    if (last_name) updates.last_name = last_name.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (email !== undefined) updates.email = email.trim()

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })

    // Update guardian record
    const { data: guardian, error } = await supabase
      .from('guardians').update(updates).eq('id', guardian_id).select().single()

    if (error) throw error

    // Also update user record if name/email changed
    const userUpdates = {}
    if (updates.first_name || updates.last_name) {
      const g = guardian
      userUpdates.full_name = `${g.first_name} ${g.last_name}`
    }
    if (updates.email) userUpdates.email = updates.email

    if (Object.keys(userUpdates).length > 0) {
      await supabase.from('users').update(userUpdates).eq('id', req.user.id)
    }

    res.json({ guardian })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /parent-data/change-password — change parent's password
router.post('/change-password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' })
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    // Get current hash
    const { data: user } = await supabase
      .from('users').select('password_hash').eq('id', req.user.id).single()

    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(new_password, 10)
    await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id)

    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
