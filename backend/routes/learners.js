const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// All routes require auth
router.use(auth)

// ─── GET /learners ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learners')
      .select(`
        *,
        classes ( name, grades ( name ) ),
        learner_guardians (
          is_primary,
          guardians ( id, first_name, last_name, phone, email, relationship )
        )
      `)
      .eq('school_id', req.user.school_id)
      .eq('is_active', true)
      .order('last_name')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /learners ──────────────────────────────────────────
// Creates learner + guardian in one go
router.post('/', async (req, res) => {
  const { learner, guardian } = req.body
  const school_id = req.user.school_id

  try {
    // 1. Create learner
    const { data: newLearner, error: lErr } = await supabase
      .from('learners')
      .insert({ ...learner, school_id })
      .select()
      .single()

    if (lErr) throw lErr

    // 2. Create guardian if provided
    if (guardian?.first_name && guardian?.phone) {
      const { data: newGuardian, error: gErr } = await supabase
        .from('guardians')
        .insert({ ...guardian, school_id })
        .select()
        .single()

      if (gErr) throw gErr

      // 3. Link learner to guardian
      await supabase
        .from('learner_guardians')
        .insert({ learner_id: newLearner.id, guardian_id: newGuardian.id, is_primary: true })
    }

    res.status(201).json(newLearner)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /learners/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learners')
      .select(`
        *,
        classes ( name, grades ( name ) ),
        learner_guardians (
          is_primary,
          guardians ( * )
        ),
        payments ( amount_paid, payment_date, payment_method, reference,
          fee_schedules ( name, term, year, amount ) )
      `)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PATCH /learners/:id ─────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('learners')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /learners/:id ────────────────────────────────────
// Soft delete only
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('learners')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
