const express = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')
const { sendWaiverRequestEmail, sendWaiverDecisionEmail } = require('../lib/email')

const router = express.Router()
router.use(auth)

const APP_URL = process.env.FRONTEND_URL || 'https://skolo.pages.dev'

// ── Helper: create a notification ────────────────────────────
async function createNotification(school_id, user_id, type, title, body, link) {
  await supabase.from('notifications').insert({ school_id, user_id, type, title, body, link })
}

// ── GET /waivers ──────────────────────────────────────────────
// All waiver requests for this school
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waiver_requests')
      .select(`
        *,
        learners ( first_name, last_name, reference_no,
          classes ( name, grades ( name ) )
        ),
        fee_ledger ( description, amount_due, amount_paid, due_date ),
        requested_user:users!waiver_requests_requested_by_fkey ( full_name, email ),
        reviewed_user:users!waiver_requests_reviewed_by_fkey  ( full_name )
      `)
      .eq('school_id', req.user.school_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /waivers — bursar requests a waiver ──────────────────
router.post('/', async (req, res) => {
  const { ledger_id, learner_id, amount_requested, reason, note } = req.body
  const school_id = req.user.school_id

  if (!ledger_id || !learner_id || !amount_requested || !reason) {
    return res.status(400).json({ error: 'ledger_id, learner_id, amount_requested and reason are required' })
  }

  try {
    // Create the waiver request
    const { data: wr, error } = await supabase
      .from('waiver_requests')
      .insert({ school_id, ledger_id, learner_id, amount_requested, reason, note, requested_by: req.user.id, status: 'pending' })
      .select().single()
    if (error) throw error

    // Get school + learner + requester info for email
    const [{ data: school }, { data: learner }, { data: requester }] = await Promise.all([
      supabase.from('schools').select('name, countries(currency_symbol)').eq('id', school_id).single(),
      supabase.from('learners').select('first_name, last_name').eq('id', learner_id).single(),
      supabase.from('users').select('full_name, email').eq('id', req.user.id).single(),
    ])

    const sym          = school?.countries?.currency_symbol || 'R'
    const learnerName  = `${learner?.first_name} ${learner?.last_name}`
    const bursarName   = requester?.full_name || 'Bursar'
    const schoolName   = school?.name || 'School'

    // Find all admin/principal users to notify
    const { data: approvers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('school_id', school_id)
      .eq('is_active', true)
      .in('role', ['admin', 'principal'])

    // Send notification + email to each approver
    for (const approver of (approvers || [])) {
      await createNotification(
        school_id, approver.id, 'waiver_request',
        `Waiver request — ${learnerName}`,
        `${bursarName} requested a ${sym}${Number(amount_requested).toLocaleString()} waiver (${reason})`,
        '/waivers'
      )

      if (approver.email) {
        await sendWaiverRequestEmail({
          to: approver.email,
          principalName: approver.full_name,
          bursarName,
          learnerName,
          amount: amount_requested,
          sym,
          reason,
          note,
          schoolName,
          appUrl: APP_URL,
          waiverId: wr.id
        })
      }
    }

    res.status(201).json(wr)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /waivers/:id/approve ─────────────────────────────────
router.post('/:id/approve', async (req, res) => {
  const { review_note } = req.body
  const school_id = req.user.school_id
  const reviewer  = req.user

  // Only admin or principal can approve
  if (!['admin', 'principal'].includes(reviewer.role)) {
    return res.status(403).json({ error: 'Only admin or principal can approve waivers' })
  }

  try {
    // Fetch the waiver request
    const { data: wr, error: wrErr } = await supabase
      .from('waiver_requests')
      .select(`*, learners(first_name, last_name), fee_ledger(*), requested_user:users!waiver_requests_requested_by_fkey(full_name, email)`)
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .single()
    if (wrErr || !wr) return res.status(404).json({ error: 'Waiver request not found' })
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Waiver already reviewed' })

    // Apply the waiver to the ledger entry
    const entry     = wr.fee_ledger
    const newWaived = Number(entry.amount_waived || 0) + Number(wr.amount_requested)
    const capped    = Math.min(newWaived, Number(entry.amount_due))
    const balance   = Number(entry.amount_due) - Number(entry.amount_paid) - capped
    const newStatus = balance <= 0 ? 'waived' : capped > 0 ? 'partial_waiver' : entry.status

    await supabase.from('fee_ledger').update({
      amount_waived: capped, waiver_reason: wr.reason,
      waiver_note: wr.note, waived_by: reviewer.id,
      status: newStatus, updated_at: new Date().toISOString()
    }).eq('id', entry.id)

    // Update waiver request status
    await supabase.from('waiver_requests').update({
      status: 'approved', reviewed_by: reviewer.id,
      review_note, updated_at: new Date().toISOString()
    }).eq('id', req.params.id)

    // Get school for email
    const { data: school } = await supabase.from('schools').select('name, countries(currency_symbol)').eq('id', school_id).single()
    const sym          = school?.countries?.currency_symbol || 'R'
    const learnerName  = `${wr.learners?.first_name} ${wr.learners?.last_name}`

    // Notify bursar in-app
    if (wr.requested_by) {
      await createNotification(
        school_id, wr.requested_by, 'waiver_approved',
        `✅ Waiver approved — ${learnerName}`,
        `Your waiver of ${sym}${Number(wr.amount_requested).toLocaleString()} has been approved by ${reviewer.full_name}`,
        '/fees'
      )
      // Email bursar
      if (wr.requested_user?.email) {
        await sendWaiverDecisionEmail({
          to: wr.requested_user.email,
          bursarName: wr.requested_user.full_name,
          learnerName,
          amount: wr.amount_requested,
          sym, approved: true,
          reviewNote: review_note,
          schoolName: school?.name,
          appUrl: APP_URL
        })
      }
    }

    res.json({ success: true, message: 'Waiver approved and applied to ledger' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /waivers/:id/reject ──────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  const { review_note } = req.body
  const school_id = req.user.school_id
  const reviewer  = req.user

  if (!['admin', 'principal'].includes(reviewer.role)) {
    return res.status(403).json({ error: 'Only admin or principal can reject waivers' })
  }
  if (!review_note?.trim()) {
    return res.status(400).json({ error: 'A reason for rejection is required' })
  }

  try {
    const { data: wr, error: wrErr } = await supabase
      .from('waiver_requests')
      .select(`*, learners(first_name, last_name), requested_user:users!waiver_requests_requested_by_fkey(full_name, email)`)
      .eq('id', req.params.id)
      .eq('school_id', school_id)
      .single()
    if (wrErr || !wr) return res.status(404).json({ error: 'Not found' })
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' })

    await supabase.from('waiver_requests').update({
      status: 'rejected', reviewed_by: reviewer.id,
      review_note, updated_at: new Date().toISOString()
    }).eq('id', req.params.id)

    const { data: school } = await supabase.from('schools').select('name, countries(currency_symbol)').eq('id', school_id).single()
    const sym         = school?.countries?.currency_symbol || 'R'
    const learnerName = `${wr.learners?.first_name} ${wr.learners?.last_name}`

    if (wr.requested_by) {
      await createNotification(
        school_id, wr.requested_by, 'waiver_rejected',
        `❌ Waiver rejected — ${learnerName}`,
        `Your waiver request of ${sym}${Number(wr.amount_requested).toLocaleString()} was rejected: ${review_note}`,
        '/waivers'
      )
      if (wr.requested_user?.email) {
        await sendWaiverDecisionEmail({
          to: wr.requested_user.email,
          bursarName: wr.requested_user.full_name,
          learnerName,
          amount: wr.amount_requested,
          sym, approved: false,
          reviewNote: review_note,
          schoolName: school?.name,
          appUrl: APP_URL
        })
      }
    }

    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
