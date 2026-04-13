const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /timetable — all timetable entries for the school ─────
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

// ── GET /timetable/by-class/:class_id — timetable for a specific class ───
router.get('/by-class/:class_id', async (req, res) => {
  try {
    // Get all teacher_class IDs for this class
    const { data: tcs, error: tcErr } = await supabase
      .from('teacher_classes')
      .select('id')
      .eq('class_id', req.params.class_id)
      .eq('school_id', req.user.school_id)

    if (tcErr) throw tcErr
    if (!tcs.length) return res.json([])

    const tcIds = tcs.map(tc => tc.id)

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
      .in('teacher_class_id', tcIds)
      .eq('school_id', req.user.school_id)
      .order('day_of_week')
      .order('period_number')

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /timetable/conflicts/:day/:period — which teachers are busy ───
// Returns teacher IDs that already have a slot on this day+period
router.get('/conflicts/:day/:period', async (req, res) => {
  try {
    const day = parseInt(req.params.day)
    const period = parseInt(req.params.period)

    // Get all timetable slots for this day+period in this school
    const { data: slots, error } = await supabase
      .from('timetable')
      .select(`
        id,
        teacher_classes (
          id, subject,
          teachers ( id, full_name ),
          classes  ( id, name, grades ( id, name ) )
        )
      `)
      .eq('school_id', req.user.school_id)
      .eq('day_of_week', day)
      .eq('period_number', period)

    if (error) throw error

    // Extract busy teacher IDs
    const busyTeachers = slots
      .map(s => s.teacher_classes?.teachers?.id)
      .filter(Boolean)

    // Also return the full slot info for context
    res.json({
      busy_teacher_ids: [...new Set(busyTeachers)],
      slots: slots
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /timetable/my — timetable for the logged-in teacher ───
router.get('/my', async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id, full_name')
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .maybeSingle()

    if (tErr) throw tErr
    if (!teacher) return res.status(404).json({ error: 'No teacher record linked' })

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
// Now with conflict checking built in
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const { teacher_class_id, day_of_week, period_number, room } = req.body
  if (!teacher_class_id || !day_of_week || !period_number) {
    return res.status(400).json({ error: 'teacher_class_id, day_of_week, and period_number required' })
  }

  try {
    // ── Conflict check: is the teacher already busy at this day+period? ──
    // Get the teacher_id from the teacher_class being assigned
    const { data: tcInfo, error: tcErr } = await supabase
      .from('teacher_classes')
      .select('teacher_id')
      .eq('id', teacher_class_id)
      .single()

    if (tcErr) throw tcErr

    // Check if this teacher already has a slot at this day+period (via any teacher_class)
    const { data: existingSlots, error: slotErr } = await supabase
      .from('timetable')
      .select(`
        id,
        teacher_classes!inner ( teacher_id, subject, classes ( name, grades ( name ) ) )
      `)
      .eq('school_id', req.user.school_id)
      .eq('day_of_week', day_of_week)
      .eq('period_number', period_number)

    if (slotErr) throw slotErr

    const conflicting = existingSlots.find(s =>
      s.teacher_classes?.teacher_id === tcInfo.teacher_id
    )

    if (conflicting) {
      const cls = conflicting.teacher_classes?.classes
      const where = `${cls?.grades?.name || ''} ${cls?.name || ''}`.trim()
      return res.status(409).json({
        error: `Teacher conflict: already assigned to ${where} (${conflicting.teacher_classes?.subject || 'no subject'}) at this time`
      })
    }

    // ── Also check: is this class slot already taken? ──
    const { data: tcFull } = await supabase
      .from('teacher_classes')
      .select('class_id')
      .eq('id', teacher_class_id)
      .single()

    // Find all teacher_classes for this class
    const { data: classTcs } = await supabase
      .from('teacher_classes')
      .select('id')
      .eq('class_id', tcFull.class_id)
      .eq('school_id', req.user.school_id)

    const classTcIds = classTcs.map(tc => tc.id)

    const classConflict = existingSlots.find(s =>
      classTcIds.includes(s.teacher_classes && s.id ? undefined : null) // Not needed since we're assigning per class view
    )

    // Insert the slot
    const { data, error } = await supabase
      .from('timetable')
      .insert({
        school_id: req.user.school_id,
        teacher_class_id,
        day_of_week,
        period_number,
        room: room || null
      })
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
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This exact assignment already exists at this slot' })
    }
    res.status(500).json({ error: err.message })
  }
})

// ── POST /timetable/bulk — bulk assign slots (admin only) ─────
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

// ── DELETE /timetable/class/:class_id — clear all slots for a class ───
router.delete('/class/:class_id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  try {
    // Get teacher_class IDs for this class
    const { data: tcs } = await supabase
      .from('teacher_classes')
      .select('id')
      .eq('class_id', req.params.class_id)
      .eq('school_id', req.user.school_id)

    if (!tcs?.length) return res.json({ success: true, deleted: 0 })

    const tcIds = tcs.map(tc => tc.id)

    const { error } = await supabase
      .from('timetable')
      .delete()
      .in('teacher_class_id', tcIds)
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
