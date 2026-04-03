const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /learner-profile/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learners')
      .select(`
        *,
        classes ( name, grades ( name ) ),
        learner_guardians (
          is_primary,
          guardians ( id, first_name, last_name, phone, email, relationship, portal_token )
        )
      `)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── EXAM RESULTS ─────────────────────────────────────────────

router.get('/:id/exam-results', async (req, res) => {
  const year = req.query.year || new Date().getFullYear()
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('learner_id', req.params.id)
      .eq('school_id', req.user.school_id)
      .eq('year', year)
      .order('subject').order('term')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Upsert a single result (subject + term + year)
router.put('/:id/exam-results', async (req, res) => {
  const { subject, term, year, mark } = req.body
  if (!subject || !term || !year) return res.status(400).json({ error: 'subject, term, year required' })
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .upsert({
        school_id:  req.user.school_id,
        learner_id: req.params.id,
        subject, term, year,
        mark: mark !== '' && mark !== null && mark !== undefined ? Number(mark) : null,
        created_by: req.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'learner_id,subject,term,year' })
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id/exam-results/:resultId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('exam_results')
      .delete()
      .eq('id', req.params.resultId)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── AWARDS ───────────────────────────────────────────────────

router.get('/:id/awards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learner_awards')
      .select('*, users(full_name)')
      .eq('learner_id', req.params.id)
      .eq('school_id', req.user.school_id)
      .order('award_date', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/awards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learner_awards')
      .insert({ ...req.body, learner_id: req.params.id, school_id: req.user.school_id, created_by: req.user.id })
      .select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id/awards/:awardId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('learner_awards')
      .delete()
      .eq('id', req.params.awardId)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── NOTES ────────────────────────────────────────────────────

router.get('/:id/notes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learner_notes')
      .select('*, users(full_name)')
      .eq('learner_id', req.params.id)
      .eq('school_id', req.user.school_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/notes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learner_notes')
      .insert({ note: req.body.note, learner_id: req.params.id, school_id: req.user.school_id, created_by: req.user.id })
      .select('*, users(full_name)').single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('learner_notes')
      .delete()
      .eq('id', req.params.noteId)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
