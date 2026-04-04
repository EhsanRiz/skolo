const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /exam-grades/classes ──────────────────────────────────
// Teacher → their assigned classes (with subject)
// Admin/Principal → all classes in school
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
        .select('id, subject, is_home_class, classes(id, name, grades(id, name))')
        .eq('teacher_id', teacher.id)
        .eq('school_id', req.user.school_id)
        .order('is_home_class', { ascending: false })

      if (error) throw error
      return res.json(data)
    }

    // Admin / Principal — all classes
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grades(id, name)')
      .eq('school_id', req.user.school_id)
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /exam-grades/class/:class_id/results ──────────────────
// Returns all active learners in the class merged with their marks
// for ?subject=X&term=1&year=2026
router.get('/class/:class_id/results', async (req, res) => {
  const { subject, term, year } = req.query
  if (!subject || !term || !year) {
    return res.status(400).json({ error: 'subject, term and year are required' })
  }

  try {
    // Learners in class
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select('id, first_name, last_name, reference_no')
      .eq('class_id', req.params.class_id)
      .eq('school_id', req.user.school_id)
      .eq('is_active', true)
      .order('last_name').order('first_name')

    if (lErr) throw lErr
    if (!learners.length) return res.json([])

    const learnerIds = learners.map(l => l.id)

    // Existing results for this subject+term+year
    const { data: results, error: rErr } = await supabase
      .from('exam_results')
      .select('learner_id, mark, id')
      .in('learner_id', learnerIds)
      .eq('school_id', req.user.school_id)
      .eq('subject', subject)
      .eq('term', Number(term))
      .eq('year', Number(year))

    if (rErr) throw rErr

    const resultMap = {}
    results.forEach(r => { resultMap[r.learner_id] = r.mark })

    const merged = learners.map(l => ({
      ...l,
      mark: resultMap[l.id] !== undefined ? resultMap[l.id] : null
    }))

    res.json(merged)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /exam-grades/bulk ────────────────────────────────────
// Bulk upsert marks for a class / subject / term / year
// Body: { class_id, subject, term, year, results: [{learner_id, mark}] }
router.post('/bulk', async (req, res) => {
  const { subject, term, year, results } = req.body

  if (!subject || !term || !year || !Array.isArray(results)) {
    return res.status(400).json({ error: 'subject, term, year, results[] required' })
  }

  // Teachers can only save — no extra check needed (they only see their classes)
  // Principal is read-only — block at API level
  if (req.user.role === 'principal') {
    return res.status(403).json({ error: 'Principals cannot edit grades' })
  }

  try {
    const upserts = results.map(r => ({
      school_id:  req.user.school_id,
      learner_id: r.learner_id,
      subject:    subject.trim(),
      term:       Number(term),
      year:       Number(year),
      mark:       r.mark !== '' && r.mark !== null && r.mark !== undefined ? Number(r.mark) : null,
      created_by: req.user.id,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('exam_results')
      .upsert(upserts, { onConflict: 'learner_id,subject,term,year' })

    if (error) throw error
    res.json({ saved: upserts.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /exam-grades/subjects ─────────────────────────────────
// Returns distinct subjects used by this school (for autocomplete)
router.get('/subjects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('subject')
      .eq('school_id', req.user.school_id)

    if (error) throw error
    const unique = [...new Set(data.map(r => r.subject))].sort()
    res.json(unique)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
