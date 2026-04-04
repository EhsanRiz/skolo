const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /attendance-alerts?threshold=80&year=2026&month=4 ─────
// Returns learners with attendance below the threshold
// Teachers → only their classes; Admin/Principal → all
router.get('/', async (req, res) => {
  try {
    const now   = new Date()
    const threshold = Math.min(100, Math.max(0, parseInt(req.query.threshold) || 80))
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const month = parseInt(req.query.month) || (now.getMonth() + 1)

    if (month < 1 || month > 12) return res.status(400).json({ error: 'month must be 1-12' })

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate   = new Date(year, month, 0).toISOString().slice(0, 10)

    // ── Determine which class IDs to check ──────────────────
    let classIds = null  // null = all classes

    if (req.user.role === 'teacher') {
      // Find teacher record first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('school_id', req.user.school_id)
        .maybeSingle()

      if (!teacher) return res.json({ threshold, month, year, alerts: [] })

      const { data: tcs } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacher.id)
        .eq('school_id', req.user.school_id)

      classIds = (tcs || []).map(tc => tc.class_id)
      if (!classIds.length) return res.json({ threshold, month, year, alerts: [] })
    }

    // ── Fetch attendance records for the month ──────────────
    let query = supabase
      .from('attendance')
      .select('learner_id, status')
      .eq('school_id', req.user.school_id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (classIds) query = query.in('class_id', classIds)

    const { data: records, error: aErr } = await query
    if (aErr) throw aErr

    if (!records || !records.length) {
      return res.json({ threshold, month, year, alerts: [] })
    }

    // ── Aggregate per learner ───────────────────────────────
    const stats = {}
    records.forEach(r => {
      if (!stats[r.learner_id]) stats[r.learner_id] = { total: 0, attended: 0, absent: 0 }
      stats[r.learner_id].total++
      if (r.status === 'present' || r.status === 'late') stats[r.learner_id].attended++
      if (r.status === 'absent') stats[r.learner_id].absent++
    })

    // ── Filter below threshold ──────────────────────────────
    const flaggedIds = Object.entries(stats)
      .filter(([_, s]) => s.total > 0 && Math.round((s.attended / s.total) * 100) < threshold)
      .map(([id]) => id)

    if (!flaggedIds.length) return res.json({ threshold, month, year, alerts: [] })

    // ── Fetch learner details for flagged IDs ───────────────
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no, classes(name, grades(name))')
      .in('id', flaggedIds)
      .eq('school_id', req.user.school_id)
      .eq('is_active', true)

    if (lErr) throw lErr

    // ── Build response ──────────────────────────────────────
    const alerts = (learners || []).map(l => {
      const s = stats[l.id]
      const rate = Math.round((s.attended / s.total) * 100)
      return {
        learner_id:   l.id,
        first_name:   l.first_name,
        last_name:    l.last_name,
        reference_no: l.reference_no,
        class_name:   l.classes?.name || '—',
        grade_name:   l.classes?.grades?.name || '—',
        total_days:   s.total,
        attended:     s.attended,
        absent:       s.absent,
        rate
      }
    }).sort((a, b) => a.rate - b.rate)  // worst first

    res.json({ threshold, month, year, alerts })
  } catch (err) {
    console.error('Attendance alerts error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
