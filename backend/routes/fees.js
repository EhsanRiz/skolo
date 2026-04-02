const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── FEE SCHEDULES ───────────────────────────────────────────

router.get('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_schedules')
      .select('*')
      .eq('school_id', req.user.school_id)
      .order('year', { ascending: false })
      .order('term')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_schedules')
      .insert({ ...req.body, school_id: req.user.school_id })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_schedules')
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

router.delete('/schedules/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('fee_schedules')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PAYMENTS ────────────────────────────────────────────────

router.get('/payments', async (req, res) => {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        learners ( first_name, last_name ),
        fee_schedules ( name, term, year, amount )
      `)
      .eq('school_id', req.user.school_id)
      .order('payment_date', { ascending: false })

    // Optional filters
    if (req.query.learner_id) query = query.eq('learner_id', req.query.learner_id)
    if (req.query.year)       query = query.eq('fee_schedules.year', req.query.year)

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/payments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...req.body,
        school_id: req.user.school_id,
        recorded_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ARREARS REPORT ──────────────────────────────────────────
// Returns all active learners with their balance per fee schedule
router.get('/arrears', async (req, res) => {
  const school_id = req.user.school_id
  const { year, term } = req.query

  try {
    // Get fee schedule for the period
    let scheduleQuery = supabase
      .from('fee_schedules')
      .select('*')
      .eq('school_id', school_id)

    if (year) scheduleQuery = scheduleQuery.eq('year', year)
    if (term) scheduleQuery = scheduleQuery.eq('term', term)

    const { data: schedules, error: sErr } = await scheduleQuery
    if (sErr) throw sErr

    // Get all active learners with their payments
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select(`
        id, first_name, last_name,
        classes ( name, grades ( name ) ),
        learner_guardians (
          is_primary,
          guardians ( first_name, last_name, phone )
        ),
        payments ( amount_paid, fee_schedule_id )
      `)
      .eq('school_id', school_id)
      .eq('is_active', true)

    if (lErr) throw lErr

    // Calculate balance per learner per schedule
    const report = learners.map(learner => {
      const totalOwed = schedules.reduce((sum, s) => sum + Number(s.amount), 0)
      const totalPaid = (learner.payments || [])
        .filter(p => schedules.find(s => s.id === p.fee_schedule_id))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0)

      return {
        id: learner.id,
        name: `${learner.first_name} ${learner.last_name}`,
        grade: learner.classes?.grades?.name || '—',
        class: learner.classes?.name || '—',
        guardian_phone: learner.learner_guardians?.find(lg => lg.is_primary)?.guardians?.phone || '—',
        total_owed: totalOwed,
        total_paid: totalPaid,
        balance: totalOwed - totalPaid,
        status: totalPaid >= totalOwed ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      }
    })

    res.json({ schedules, report })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
