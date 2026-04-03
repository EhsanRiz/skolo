const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')
const { nextRefNo } = require('../lib/sequences')
const { autoGenerateMonthlyFees } = require('../lib/autoGenerate')

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
    // 1. Assign reference number
    const reference_no = await nextRefNo(school_id, 'learner')

    // 2. Create learner
    const { data: newLearner, error: lErr } = await supabase
      .from('learners')
      .insert({ ...learner, school_id, reference_no })
      .select()
      .single()

    if (lErr) throw lErr

    // 1b. Auto-generate monthly fees for this learner immediately
    // Fire and forget — don't block the response if it fails
    autoGenerateMonthlyFees(school_id, newLearner.id).catch(err =>
      console.error('Auto-generate fees for new learner failed:', err.message)
    )

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


// ─── POST /learners/bulk ─────────────────────────────────────
router.post('/bulk', async (req, res) => {
  const { rows } = req.body
  const school_id = req.user.school_id
  if (!Array.isArray(rows) || !rows.length)
    return res.status(400).json({ error: 'No rows provided' })

  const results = { imported: 0, skipped: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      if (!row.first_name || !row.last_name) {
        results.skipped++; results.errors.push(`Row ${i+2}: missing name`); continue
      }
      if (!row.guardian_phone) {
        results.skipped++; results.errors.push(`Row ${i+2}: ${row.first_name} — missing guardian_phone`); continue
      }
      const ref_no = await nextRefNo(school_id, 'learner')
      const { data: learner, error: lErr } = await supabase.from('learners')
        .insert({ school_id, first_name: row.first_name.trim(), last_name: row.last_name.trim(),
          date_of_birth: row.date_of_birth || null, gender: row.gender || null,
          reference_no: ref_no })
        .select().single()
      if (lErr) throw lErr

      const { data: guardian, error: gErr } = await supabase.from('guardians')
        .insert({ school_id,
          first_name:   (row.guardian_first_name || row.first_name).trim(),
          last_name:    (row.guardian_last_name  || row.last_name).trim(),
          phone:        row.guardian_phone.toString().trim(),
          email:        row.guardian_email || null,
          relationship: row.guardian_relationship || 'guardian' })
        .select().single()
      if (gErr) throw gErr

      await supabase.from('learner_guardians')
        .insert({ learner_id: learner.id, guardian_id: guardian.id, is_primary: true })
      results.imported++
    } catch (err) {
      results.skipped++; results.errors.push(`Row ${i+2}: ${err.message}`)
    }
  }
  res.json(results)
})

module.exports = router
