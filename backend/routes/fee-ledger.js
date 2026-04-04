const express = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')
const { logActivity } = require('../lib/activityLog')

const router = express.Router()
router.use(auth)

// ── Status helper ─────────────────────────────────────────────
function computeStatus(amount_due, amount_paid, due_date, amount_waived) {
  const paid    = Number(amount_paid)
  const due     = Number(amount_due)
  const waived  = Number(amount_waived || 0)
  const settled = paid + waived

  if (settled >= due)  return waived > 0 ? 'waived' : 'paid'
  if (waived > 0)      return 'partial_waiver'
  if (paid > 0)        return 'partial'
  if (new Date(due_date) < new Date()) return 'overdue'
  return 'pending'
}

// ── GET /fee-ledger ───────────────────────────────────────────
// Filters: status, month (YYYY-MM), year, grade_id, learner_id
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('fee_ledger')
      .select(`
        *,
        learners (
          id, first_name, last_name, class_id,
          classes ( name, grade_id, grades ( name ) )
        ),
        fee_plans ( name, frequency )
      `)
      .eq('school_id', req.user.school_id)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (req.query.status)     query = query.eq('status', req.query.status)
    if (req.query.learner_id) query = query.eq('learner_id', req.query.learner_id)
    if (req.query.month) {
      const [y, m] = req.query.month.split('-')
      const from = `${y}-${m}-01`
      const to   = new Date(y, m, 0).toISOString().slice(0, 10) // last day of month
      query = query.gte('due_date', from).lte('due_date', to)
    }
    if (req.query.year) {
      query = query.gte('due_date', `${req.query.year}-01-01`)
                   .lte('due_date', `${req.query.year}-12-31`)
    }

    const { data, error } = await query
    if (error) throw error

    // Recompute status live (catches overdue since last update)
    const updated = (data || []).map(row => ({
      ...row,
      status: computeStatus(row.amount_due, row.amount_paid, row.due_date, row.amount_waived)
    }))

    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /fee-ledger/summary ───────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear()
    const { data, error } = await supabase
      .from('fee_ledger')
      .select('amount_due, amount_paid, due_date, status')
      .eq('school_id', req.user.school_id)
      .gte('due_date', `${year}-01-01`)
      .lte('due_date', `${year}-12-31`)
    if (error) throw error

    const rows = (data || []).map(r => ({
      ...r,
      status: computeStatus(r.amount_due, r.amount_paid, r.due_date, r.amount_waived)
    }))

    const totalDue      = rows.reduce((s, r) => s + Number(r.amount_due), 0)
    const totalPaid     = rows.reduce((s, r) => s + Number(r.amount_paid), 0)
    const totalWaived   = rows.reduce((s, r) => s + Number(r.amount_waived || 0), 0)
    const overdueCount  = rows.filter(r => r.status === 'overdue').length
    const overdueAmount = rows.filter(r => r.status === 'overdue')
                              .reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid) - Number(r.amount_waived||0)), 0)
    const waivedCount   = rows.filter(r => Number(r.amount_waived||0) > 0).length

    res.json({ totalDue, totalPaid, totalWaived, waivedCount, outstanding: totalDue - totalPaid - totalWaived, overdueCount, overdueAmount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /fee-ledger/auto-generate ──────────────────────────
// Silently generates all missing monthly entries up to current month
// Safe to call on every page load — idempotent
router.post('/auto-generate', async (req, res) => {
  try {
    const result = await autoGenerateMonthlyFees(req.user.school_id)
    res.json(result)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /fee-ledger/preview ──────────────────────────────────
// Dry-run of what generate would create — no DB writes
router.get('/preview', async (req, res) => {
  const { frequency, year, month, term } = req.query
  const school_id = req.user.school_id
  if (!frequency || !year) return res.status(400).json({ error: 'frequency and year required' })
  try {
    let planQuery = supabase.from('fee_plans').select('*, grades(id, name)')
      .eq('school_id', school_id).eq('frequency', frequency).eq('year', Number(year)).eq('is_active', true)
    if (frequency === 'termly' && term) planQuery = planQuery.eq('term', Number(term))
    const { data: plans, error: planErr } = await planQuery
    if (planErr) throw planErr

    const { data: learners, error: lErr } = await supabase.from('learners')
      .select('id, first_name, last_name, reference_no, class_id, classes(grade_id, name, grades(id, name))')
      .eq('school_id', school_id).eq('is_active', true)
    if (lErr) throw lErr

    // Get existing entries for this period
    const m = month ? String(month).padStart(2,'0') : '01'
    const { data: existing } = await supabase.from('fee_ledger').select('learner_id, fee_plan_id')
      .eq('school_id', school_id)
      .gte('due_date', `${year}-${m}-01`)
      .lte('due_date', `${year}-${m}-31`)
    const existingKeys = new Set((existing||[]).map(e=>`${e.learner_id}|${e.fee_plan_id}`))

    const rows = []
    const coveredIds = new Set()

    ;(plans||[]).forEach(plan => {
      const eligible = plan.grade_id
        ? (learners||[]).filter(l=>l.classes?.grade_id===plan.grade_id)
        : (learners||[])
      const toCreate  = eligible.filter(l=>!existingKeys.has(`${l.id}|${plan.id}`))
      eligible.forEach(l=>coveredIds.add(l.id))
      rows.push({
        grade_name:    plan.grades?.name || 'All grades',
        plan_name:     plan.name,
        plan_id:       plan.id,
        amount:        plan.amount,
        learner_count: eligible.length,
        to_create:     toCreate.length,
        already_done:  eligible.length - toCreate.length,
        total_amount:  plan.amount * toCreate.length,
      })
    })

    const learnersWithoutPlan = (learners||[]).filter(l=>!coveredIds.has(l.id)).map(l=>({
      id: l.id,
      name: `${l.first_name} ${l.last_name}`,
      reference_no: l.reference_no,
      grade: l.classes?.grades?.name || 'Unknown',
      class: l.classes?.name || '',
    }))

    res.json({
      rows,
      learners_without_plan: learnersWithoutPlan,
      total_to_create: rows.reduce((s,r)=>s+r.to_create,0),
      total_amount:    rows.reduce((s,r)=>s+r.total_amount,0),
      has_plans:       (plans||[]).length > 0,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /fee-ledger/generate ─────────────────────────────────
// Generates ledger entries for a given period
// Body: { frequency: 'monthly'|'termly', year, month (for monthly), term (for termly), due_date }
router.post('/generate', async (req, res) => {
  const { frequency, year, month, term, due_date } = req.body
  const school_id = req.user.school_id

  if (!frequency || !year) {
    return res.status(400).json({ error: 'frequency and year are required' })
  }
  if (frequency === 'monthly' && !month) {
    return res.status(400).json({ error: 'month is required for monthly frequency' })
  }
  if (frequency === 'termly' && !term) {
    return res.status(400).json({ error: 'term is required for termly frequency' })
  }

  try {
    // Get active fee plans matching frequency
    let planQuery = supabase
      .from('fee_plans')
      .select('*, grades(id)')
      .eq('school_id', school_id)
      .eq('frequency', frequency)
      .eq('year', year)
      .eq('is_active', true)

    if (frequency === 'termly') planQuery = planQuery.eq('term', term)

    const { data: plans, error: planErr } = await planQuery
    if (planErr) throw planErr
    if (!plans || plans.length === 0) {
      return res.json({ created: 0, skipped: 0, message: 'No active fee plans found for this period' })
    }

    // Get all active learners with their class/grade
    const { data: learners, error: lErr } = await supabase
      .from('learners')
      .select('id, first_name, last_name, class_id, classes(grade_id)')
      .eq('school_id', school_id)
      .eq('is_active', true)

    if (lErr) throw lErr

    let created = 0
    let skipped = 0
    const entries = []

    for (const plan of plans) {
      // Determine due_date for this entry
      let entryDueDate = due_date
      if (!entryDueDate) {
        if (frequency === 'monthly') {
          const day = plan.due_day || 1
          entryDueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        } else {
          // Default term start dates
          const termDates = { 1: `${year}-01-15`, 2: `${year}-04-08`, 3: `${year}-07-14`, 4: `${year}-09-15` }
          entryDueDate = termDates[term] || `${year}-01-15`
        }
      }

      // Month label for description
      const monthLabel = frequency === 'monthly'
        ? new Date(year, month - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
        : `Term ${term} ${year}`

      const description = `${plan.name} — ${monthLabel}`

      // Find learners in this grade
      const eligible = plan.grade_id
        ? learners.filter(l => l.classes?.grade_id === plan.grade_id)
        : learners // no grade restriction = all learners

      for (const learner of eligible) {
        entries.push({
          school_id,
          learner_id:  learner.id,
          fee_plan_id: plan.id,
          description,
          due_date:    entryDueDate,
          amount_due:  plan.amount,
          amount_paid: 0,
          status:      new Date(entryDueDate) < new Date() ? 'overdue' : 'pending'
        })
      }
    }

    // Check for existing entries to avoid duplicates (manual deduplication)
    if (entries.length > 0) {
      const planIds = [...new Set(entries.map(e => e.fee_plan_id))]
      const dueDates = [...new Set(entries.map(e => e.due_date))]

      const { data: existing } = await supabase
        .from('fee_ledger')
        .select('learner_id, fee_plan_id, due_date')
        .eq('school_id', school_id)
        .in('fee_plan_id', planIds)

      // Month-level dedup: one entry per learner+plan per month regardless of exact date
      const existingKeys = new Set(
        (existing || []).map(e => `${e.learner_id}|${e.fee_plan_id}|${e.due_date.slice(0,7)}`)
      )

      const newEntries = entries.filter(e =>
        !existingKeys.has(`${e.learner_id}|${e.fee_plan_id}|${e.due_date.slice(0,7)}`)
      )
      skipped = entries.length - newEntries.length

      const BATCH = 50
      for (let i = 0; i < newEntries.length; i += BATCH) {
        const batch = newEntries.slice(i, i + BATCH)
        const { data: inserted, error: insErr } = await supabase
          .from('fee_ledger')
          .insert(batch)
          .select('id')
        if (insErr) throw insErr
        created += (inserted || []).length
      }
    }

    res.json({ created, skipped, total_learners: entries.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /fee-ledger/:id/waive ───────────────────────────────
// Apply a waiver/discount to a fee entry
router.post('/:id/waive', async (req, res) => {
  const { amount, reason, note } = req.body
  const school_id = req.user.school_id

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Waiver amount must be greater than 0' })
  }
  if (!reason) {
    return res.status(400).json({ error: 'Waiver reason is required' })
  }

  try {
    const { data: entry, error: fetchErr } = await supabase
      .from('fee_ledger')
      .select('*')
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .single()
    if (fetchErr) throw fetchErr

    // Cap waiver so paid + waived cannot exceed amount_due
    const maxWaiver    = Number(entry.amount_due) - Number(entry.amount_paid)
    const waiveAmount  = Math.min(Number(amount), maxWaiver)
    const newWaived    = Number(entry.amount_waived || 0) + waiveAmount
    const newStatus    = computeStatus(entry.amount_due, entry.amount_paid, entry.due_date, newWaived)

    const { data, error } = await supabase
      .from('fee_ledger')
      .update({
        amount_waived: newWaived,
        waiver_reason: reason,
        waiver_note:   note || null,
        waived_by:     req.user.id,
        status:        newStatus,
        updated_at:    new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /fee-ledger/:id/remove-waiver ───────────────────────
// Remove a waiver from an entry
router.post('/:id/remove-waiver', async (req, res) => {
  const school_id = req.user.school_id
  try {
    const { data: entry } = await supabase
      .from('fee_ledger').select('*')
      .eq('id', req.params.id).eq('school_id', school_id).single()

    const newStatus = computeStatus(entry.amount_due, entry.amount_paid, entry.due_date, 0)

    const { data, error } = await supabase
      .from('fee_ledger')
      .update({ amount_waived:0, waiver_reason:null, waiver_note:null, waived_by:null, status:newStatus, updated_at:new Date().toISOString() })
      .eq('id', req.params.id).eq('school_id', school_id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /fee-ledger/:id/pay ──────────────────────────────────
// Record a payment against a ledger entry (partial or full)
router.post('/:id/pay', async (req, res) => {
  const { amount, notes, payment_method } = req.body
  const school_id = req.user.school_id

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' })
  }

  try {
    // Fetch current entry
    const { data: entry, error: fetchErr } = await supabase
      .from('fee_ledger')
      .select('*')
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .single()
    if (fetchErr) throw fetchErr

    const newAmountPaid = Number(entry.amount_paid) + Number(amount)
    const capped        = Math.min(newAmountPaid, Number(entry.amount_due))
    const newStatus     = computeStatus(entry.amount_due, capped, entry.due_date, entry.amount_waived)

    const { data, error } = await supabase
      .from('fee_ledger')
      .update({
        amount_paid: capped,
        status:      newStatus,
        recorded_by: req.user.id,
        notes:       [payment_method ? `method:${payment_method}` : null, notes].filter(Boolean).join(' | ') || entry.notes,
        updated_at:  new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .select()
      .single()

    if (error) throw error
    logActivity({ school_id, user_id: req.user.id, action: 'fee_paid', entity_type: 'fee_ledger', entity_id: req.params.id, metadata: { amount: Number(amount) } })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DELETE /fee-ledger/:id ────────────────────────────────────
// Remove a ledger entry (admin only, e.g. generated in error)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('fee_ledger')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
