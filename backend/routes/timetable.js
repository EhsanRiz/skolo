const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /timetable — all timetable entries for the school ─────
// Includes teacher + class + grade info for display
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetable')
      .select(`
        *,
        teacher_classes (
          id, subject, is_home_class,
          teachers ( id, full_name, reference_no ),
          classes  ( id, name, grades ( id, name ) )
        )
      `)
      .eq('school_id', req.user.school_id)
      .order('day_of_week')
      .order('period_number')

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /timetable/my — timetable for the logged-in teacher ───
router.get('/my', async (req, res) => {
  try {
    // Find teacher record
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id, full_name')
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .maybeSingle()

    if (tErr) throw tErr
    if (!teacher) return res.status(404).json({ error: 'No teacher record linked' })

    // Get teacher_class IDs
    const { data: tcs, error: tcErr } = await supabase
      .from('teacher_classes')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('school_id', req.user.school_id)

    if (tcErr) throw tcErr
    if (!tcs.length) return res.json({ teacher, slots: [] })

    const tcIds = tcs.map(tc => tc.id)

    const { data, error } = await supabase
      .from('timetable')
      .select(`
        *,
        teacher_classes (
          id, subject, is_home_class,
          classes ( id, name, grades ( id, name ) )
        )
      `)
      .in('teacher_class_id', tcIds)
      .eq('school_id', req.user.school_id)
      .order('day_of_week')
      .order('period_number')

    if (error) throw error
    res.json({ teacher, slots: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /timetable — add a slot (admin only) ────────────────
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const { teacher_class_id, day_of_week, period_number, room } = req.body
  if (!teacher_class_id || !day_of_week || !period_number) {
    return res.status(400).json({ error: 'teacher_class_id, day_of_week, and period_number required' })
  }

  try {
    const { data, error } = await supabase
      .from('timetable')
      .upsert({
        school_id: req.user.school_id,
        teacher_class_id,
        day_of_week,
        period_number,
        room: room || null
      }, { onConflict: 'school_id,teacher_class_id,day_of_week,period_number' })
      .select(`
        *,
        teacher_classes (
          id, subject, is_home_class,
          teachers ( id, full_name ),
          classes  ( id, name, grades ( id, name ) )
        )
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /timetable/bulk — bulk assign slots (admin only) ─────
// Body: { slots: [{ teacher_class_id, day_of_week, period_number, room? }] }
router.post('/bulk', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const { slots } = req.body
  if (!Array.isArray(slots) || !slots.length) {
    return res.status(400).json({ error: 'slots[] required' })
  }

  try {
    const upserts = slots.map(s => ({
      school_id: req.user.school_id,
      teacher_class_id: s.teacher_class_id,
      day_of_week: s.day_of_week,
      period_number: s.period_number,
      room: s.room || null
    }))

    const { data, error } = await supabase
      .from('timetable')
      .upsert(upserts, { onConflict: 'school_id,teacher_class_id,day_of_week,period_number' })
      .select()

    if (error) throw error
    res.json({ saved: data.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DELETE /timetable/:id ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  try {
    const { error } = await supabase
      .from('timetable')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DELETE /timetable/clear-all — remove all slots (admin) ────
router.delete('/clear-all', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  try {
    const { error } = await supabase
      .from('timetable')
      .delete()
      .eq('school_id', req.user.school_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
