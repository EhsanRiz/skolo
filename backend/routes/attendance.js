const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')
const { logActivity } = require('../lib/activityLog')

const router = express.Router()
router.use(auth)

// ── GET /attendance/classes ───────────────────────────────────
// Teacher → their home/assigned classes; Admin/Principal → all
router.get('/classes', async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('school_id', req.user.school_id)
        .maybeSingle()

      if (!teacher) return res.json([])

      const { data, error } = await supabase
        .from('teacher_classes')
        .select('classes(id, name, grades(id, name))')
        .eq('teacher_id', teacher.id)
        .eq('school_id', req.user.school_id)
        .order('is_home_class', { ascending: false })

      if (error) throw error
      // Deduplicate classes (teacher may have multiple subjects in same class)
      const seen = new Set()
      const unique = data.filter(r => {
        if (seen.has(r.classes.id)) return false
        seen.add(r.classes.id); return true
      })
      return res.json(unique.map(r => r.classes))
    }

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grades(id, name)')
      .eq('school_id', req.user.school_id)
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /attendance/class/:class_id/register?date=YYYY-MM-DD ─
// Returns all active learners with their attendance status for the date
router.get('/class/:class_id/register', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  try {
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no')
      .eq('class_id', req.params.class_id)
      .eq('school_id', req.user.school_id)
      .eq('is_active', true)
      .order('last_name').order('first_name')

    if (lErr) throw lErr
    if (!learners.length) return res.json([])

    const ids = learners.map(l => l.id)

    const { data: records, error: rErr } = await supabase
      .from('attendance')
      .select('learner_id, status, note')
      .in('learner_id', ids)
      .eq('date', date)
      .eq('school_id', req.user.school_id)

    if (rErr) throw rErr

    const map = {}
    records.forEach(r => { map[r.learner_id] = { status: r.status, note: r.note } })

    // Get register metadata — who last saved this register and when
    let register_meta = null
    if (records.length > 0) {
      // Grab created_by + updated_at from any record for this class+date
      const { data: metaRec } = await supabase
        .from('attendance')
        .select('created_by, updated_at')
        .in('learner_id', ids)
        .eq('date', date)
        .eq('school_id', req.user.school_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (metaRec?.created_by) {
        // Look up the user who saved it
        const { data: savedBy } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', metaRec.created_by)
          .maybeSingle()

        // Try to get their name from teachers table
        let savedByName = savedBy?.email || 'Unknown'
        if (savedBy) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('full_name')
            .eq('user_id', savedBy.id)
            .maybeSingle()
          if (teacher?.full_name) savedByName = teacher.full_name
        }

        register_meta = {
          saved_by: savedByName,
          saved_by_role: savedBy?.role || 'unknown',
          saved_at: metaRec.updated_at
        }
      }
    }

    res.json({
      learners: learners.map(l => ({
        ...l,
        status: map[l.id]?.status || null,
        note:   map[l.id]?.note   || ''
      })),
      register_meta
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /attendance/bulk ─────────────────────────────────────
// Bulk upsert a day's register
// Body: { class_id, date, records: [{learner_id, status, note?}] }
router.post('/bulk', async (req, res) => {
  const { class_id, date, records } = req.body
  if (!class_id || !date || !Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'class_id, date and records[] required' })
  }

  const VALID = ['present', 'absent', 'late', 'excused']
  for (const r of records) {
    if (!VALID.includes(r.status)) return res.status(400).json({ error: `Invalid status: ${r.status}` })
  }

  try {
    const upserts = records.map(r => ({
      school_id:  req.user.school_id,
      class_id,
      learner_id: r.learner_id,
      date,
      status:     r.status,
      note:       r.note || null,
      created_by: req.user.id,
      marked_by_role: req.user.role,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('attendance')
      .upsert(upserts, { onConflict: 'learner_id,date' })

    if (error) throw error
    logActivity({ school_id: req.user.school_id, user_id: req.user.id, action: 'attendance_saved', entity_type: 'attendance', metadata: { class_id, date, count: upserts.length } })
    res.json({ saved: upserts.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /attendance/class/:class_id/summary?year=&month= ──────
// Monthly aggregate: per learner counts of each status + %
router.get('/class/:class_id/summary', async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.status(400).json({ error: 'year and month required' })

  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const to   = new Date(year, month, 0).toISOString().slice(0,10) // last day of month

  try {
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no')
      .eq('class_id', req.params.class_id)
      .eq('school_id', req.user.school_id)
      .eq('is_active', true)
      .order('last_name').order('first_name')

    if (lErr) throw lErr
    if (!learners.length) return res.json({ learners: [], school_days: 0 })

    const ids = learners.map(l => l.id)

    const { data: records, error: rErr } = await supabase
      .from('attendance')
      .select('learner_id, date, status')
      .in('learner_id', ids)
      .eq('school_id', req.user.school_id)
      .gte('date', from)
      .lte('date', to)

    if (rErr) throw rErr

    // Count distinct school days recorded for the class
    const daysSet = new Set(records.map(r => r.date))
    const school_days = daysSet.size

    // Aggregate per learner
    const agg = {}
    ids.forEach(id => { agg[id] = { present: 0, absent: 0, late: 0, excused: 0 } })
    records.forEach(r => { if (agg[r.learner_id]) agg[r.learner_id][r.status]++ })

    const result = learners.map(l => {
      const c = agg[l.id]
      const attended = c.present + c.late  // late counts as attended
      const total    = c.present + c.absent + c.late + c.excused
      return {
        ...l, ...c,
        total,
        pct: total ? Math.round((attended / total) * 100) : null
      }
    })

    res.json({ learners: result, school_days })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /attendance/learner/:learner_id/history?year=&month= ──
// Per-learner daily history for a month
router.get('/learner/:learner_id/history', async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.status(400).json({ error: 'year and month required' })

  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const to   = new Date(year, month, 0).toISOString().slice(0,10)

  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('date, status, note')
      .eq('learner_id', req.params.learner_id)
      .eq('school_id', req.user.school_id)
      .gte('date', from)
      .lte('date', to)
      .order('date')

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
