const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /teacher-classes — get all class assignments for school ─
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select(`
        *,
        teachers ( id, full_name, reference_no, subject ),
        classes  ( id, name, grades ( id, name ) )
      `)
      .eq('school_id', req.user.school_id)
      .order('created_at')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /teacher-classes/my — classes for the logged-in teacher ─
router.get('/my', async (req, res) => {
  try {
    // Find the teacher record linked to this user
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id, full_name, reference_no')
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .maybeSingle()

    if (tErr) throw tErr
    if (!teacher) return res.status(404).json({ error: 'No teacher record linked to your account' })

    const { data, error } = await supabase
      .from('teacher_classes')
      .select(`
        *,
        classes (
          id, name,
          grades ( id, name ),
          learners (
            id, first_name, last_name, reference_no, is_active
          )
        )
      `)
      .eq('teacher_id', teacher.id)
      .eq('school_id', req.user.school_id)
      .order('is_home_class', { ascending: false })

    if (error) throw error
    res.json({ teacher, classes: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /teacher-classes — assign a teacher to a class ─────────
router.post('/', async (req, res) => {
  const { teacher_id, class_id, subject, is_home_class } = req.body
  if (!teacher_id || !class_id) {
    return res.status(400).json({ error: 'teacher_id and class_id required' })
  }
  try {
    // If setting as home class, unset any existing home class for this teacher
    if (is_home_class) {
      await supabase.from('teacher_classes')
        .update({ is_home_class: false })
        .eq('teacher_id', teacher_id)
        .eq('school_id', req.user.school_id)
    }

    const { data, error } = await supabase
      .from('teacher_classes')
      .upsert({
        school_id: req.user.school_id,
        teacher_id, class_id,
        subject: subject || null,
        is_home_class: !!is_home_class
      }, { onConflict: 'teacher_id,class_id,subject' })
      .select(`*, classes(id, name, grades(name))`)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DELETE /teacher-classes/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('teacher_classes')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── PATCH /teachers/:id/link-user — link teacher to user account ─
router.patch('/link-user/:teacher_id', async (req, res) => {
  const { user_id } = req.body
  try {
    const { data, error } = await supabase
      .from('teachers')
      .update({ user_id: user_id || null })
      .eq('id', req.params.teacher_id)
      .eq('school_id', req.user.school_id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
