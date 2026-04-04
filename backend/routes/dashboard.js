const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /dashboard/summary ──────────────────────────────────
// Single endpoint returning all key metrics for admin/principal dashboards.
// Avoids multiple round-trips from the frontend.
router.get('/summary', async (req, res) => {
  try {
    const school_id = req.user.school_id
    const now   = new Date()
    const year  = parseInt(req.query.year) || now.getFullYear()
    const month = parseInt(req.query.month) || (now.getMonth() + 1)

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate   = new Date(year, month, 0).toISOString().slice(0, 10)
    const yearStart = `${year}-01-01`
    const yearEnd   = `${year}-12-31`

    // ── Parallel data fetch ─────────────────────────────────
    const [
      learnersRes,
      teachersRes,
      classesRes,
      feeRes,
      attendanceRes,
      waiversRes,
      eventsRes,
    ] = await Promise.all([
      supabase.from('learners').select('id, class_id, classes(name, grade_id, grades(name))').eq('school_id', school_id).eq('is_active', true),
      supabase.from('teachers').select('id').eq('school_id', school_id).eq('is_active', true),
      supabase.from('classes').select('id, name, grade_id, grades(name)').eq('school_id', school_id),
      supabase.from('fee_ledger').select('amount_due, amount_paid, amount_waived, due_date, status, learners(class_id, classes(grade_id, grades(name)))').eq('school_id', school_id).gte('due_date', yearStart).lte('due_date', yearEnd),
      supabase.from('attendance').select('learner_id, class_id, status').eq('school_id', school_id).gte('date', startDate).lte('date', endDate),
      supabase.from('waiver_requests').select('id, status').eq('school_id', school_id).eq('status', 'pending'),
      supabase.from('events').select('id, title, event_date, event_type').eq('school_id', school_id).gte('event_date', now.toISOString().slice(0,10)).order('event_date', { ascending: true }).limit(5),
    ])

    const learners   = learnersRes.data || []
    const teachers   = teachersRes.data || []
    const classes    = classesRes.data || []
    const feeLedger  = feeRes.data || []
    const attendance = attendanceRes.data || []
    const waivers    = waiversRes.data || []
    const events     = eventsRes.data || []

    // ── Fee stats (full year) ───────────────────────────────
    const totalDue  = feeLedger.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPaid = feeLedger.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
    const totalWaived = feeLedger.reduce((s, r) => s + Number(r.amount_waived || 0), 0)
    const outstanding = totalDue - totalPaid - totalWaived
    const collectionRate = totalDue > 0 ? Math.round(totalPaid / totalDue * 100) : 0
    const overdueCount = feeLedger.filter(r => {
      const bal = Number(r.amount_due) - Number(r.amount_paid) - Number(r.amount_waived || 0)
      return bal > 0 && new Date(r.due_date) < now
    }).length

    // ── Fee by grade (full year) ────────────────────────────
    const feeByGrade = {}
    feeLedger.forEach(r => {
      const gradeName = r.learners?.classes?.grades?.name || 'Unassigned'
      if (!feeByGrade[gradeName]) feeByGrade[gradeName] = { name: gradeName, due: 0, paid: 0 }
      feeByGrade[gradeName].due  += Number(r.amount_due || 0)
      feeByGrade[gradeName].paid += Number(r.amount_paid || 0)
    })
    const feeGradeStats = Object.values(feeByGrade)
      .map(g => ({ ...g, rate: g.due > 0 ? Math.round(g.paid / g.due * 100) : 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    // ── Attendance stats (current month) ────────────────────
    const attStats = {}
    attendance.forEach(r => {
      if (!attStats[r.learner_id]) attStats[r.learner_id] = { total: 0, attended: 0, classId: r.class_id }
      attStats[r.learner_id].total++
      if (r.status === 'present' || r.status === 'late') attStats[r.learner_id].attended++
    })

    const learnerRates = Object.values(attStats).map(s => s.total > 0 ? (s.attended / s.total) * 100 : 100)
    const schoolAttendanceRate = learnerRates.length > 0
      ? Math.round(learnerRates.reduce((s, r) => s + r, 0) / learnerRates.length)
      : null

    // ── Attendance by grade (current month) ─────────────────
    // Map learner -> grade
    const learnerGradeMap = {}
    learners.forEach(l => {
      learnerGradeMap[l.id] = l.classes?.grades?.name || 'Unassigned'
    })

    const attByGrade = {}
    Object.entries(attStats).forEach(([learnerId, s]) => {
      const gradeName = learnerGradeMap[learnerId] || 'Unassigned'
      if (!attByGrade[gradeName]) attByGrade[gradeName] = { name: gradeName, totalDays: 0, attended: 0 }
      attByGrade[gradeName].totalDays += s.total
      attByGrade[gradeName].attended  += s.attended
    })
    const attGradeStats = Object.values(attByGrade)
      .map(g => ({ ...g, rate: g.totalDays > 0 ? Math.round(g.attended / g.totalDays * 100) : 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    // ── Monthly fee collection trend (last 6 months) ────────
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mEntries = feeLedger.filter(r => r.due_date && r.due_date.slice(0, 7) === mKey)
      const mDue  = mEntries.reduce((s, r) => s + Number(r.amount_due || 0), 0)
      const mPaid = mEntries.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
      const mLabel = d.toLocaleDateString('en-ZA', { month: 'short' })
      monthlyTrend.push({ month: mLabel, due: mDue, paid: mPaid })
    }

    // ── Learners by grade ───────────────────────────────────
    const learnersByGrade = {}
    learners.forEach(l => {
      const gName = l.classes?.grades?.name || 'Unassigned'
      learnersByGrade[gName] = (learnersByGrade[gName] || 0) + 1
    })

    res.json({
      learnerCount:     learners.length,
      teacherCount:     teachers.length,
      classCount:       classes.length,
      pendingWaivers:   waivers.length,
      upcomingEvents:   events,
      feeStats: {
        totalDue, totalPaid, totalWaived, outstanding,
        collectionRate, overdueCount,
      },
      attendanceRate:   schoolAttendanceRate,
      feeGradeStats,
      attGradeStats,
      monthlyTrend,
      learnersByGrade,
    })
  } catch (err) {
    console.error('Dashboard summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
