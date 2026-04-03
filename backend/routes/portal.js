const express  = require('express')
const crypto   = require('crypto')
const supabase = require('../lib/supabase')

const router = express.Router()
// NOTE: No auth middleware — portal is public (token-secured)

// ── POST /portal/generate ─────────────────────────────────────
// Called by admin — generates/refreshes a portal token for a guardian
// Requires admin auth token in header
const auth = require('../middleware/auth')
router.post('/generate', auth, async (req, res) => {
  const { guardian_id } = req.body
  if (!guardian_id) return res.status(400).json({ error: 'guardian_id required' })

  try {
    const token = crypto.randomBytes(24).toString('hex')

    const { data, error } = await supabase
      .from('guardians')
      .update({ portal_token: token })
      .eq('id', guardian_id)
      .eq('school_id', req.user.school_id)
      .select('id, first_name, last_name, portal_token')
      .single()

    if (error) throw error
    res.json({ token, portal_url: `/parent/${token}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /portal/:token ────────────────────────────────────────
// Public — returns parent + all linked learners with fee summary
router.get('/:token', async (req, res) => {
  try {
    // Find guardian by token
    const { data: guardian, error: gErr } = await supabase
      .from('guardians')
      .select(`
        id, first_name, last_name, phone, email, school_id,
        learner_guardians (
          is_primary,
          learners (
            id, first_name, last_name, reference_no, is_active,
            classes ( name, grades ( name ) )
          )
        )
      `)
      .eq('portal_token', req.params.token)
      .single()

    if (gErr || !guardian) {
      return res.status(404).json({ error: 'Portal link not found or expired' })
    }

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('name, logo_url, countries(currency_symbol, currency_code)')
      .eq('id', guardian.school_id)
      .single()

    // Get active learners linked to this guardian
    const learners = (guardian.learner_guardians || [])
      .map(lg => lg.learners)
      .filter(l => l && l.is_active)

    // For each learner, get their fee ledger summary (current year)
    const year = new Date().getFullYear()
    const learnerData = await Promise.all(learners.map(async learner => {
      const { data: ledger } = await supabase
        .from('fee_ledger')
        .select('id, description, due_date, amount_due, amount_paid, status')
        .eq('learner_id', learner.id)
        .eq('school_id', guardian.school_id)
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`)
        .order('due_date', { ascending: false })

      const entries = ledger || []
      const totalDue  = entries.reduce((s,e) => s + Number(e.amount_due), 0)
      const totalPaid = entries.reduce((s,e) => s + Number(e.amount_paid), 0)

      return {
        ...learner,
        grade: `${learner.classes?.grades?.name || ''} ${learner.classes?.name || ''}`.trim(),
        fee_summary: {
          total_due:  totalDue,
          total_paid: totalPaid,
          balance:    totalDue - totalPaid,
          overdue:    entries.filter(e => e.status === 'overdue').length,
        },
        recent_entries: entries.slice(0, 6)
      }
    }))

    res.json({
      guardian: { first_name: guardian.first_name, last_name: guardian.last_name },
      school,
      learners: learnerData
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
