// Lightweight, role-aware counts for the staff sidebar amber badges.
// Returned: { messages, waivers, fees, attendance }
// Counts are 0 for items the user shouldn't see — frontend then hides the badge.

const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

router.get('/', async (req, res) => {
  const { id: userId, school_id, role } = req.user
  const out = { messages: 0, waivers: 0, fees: 0, attendance: 0 }

  try {
    // ── Unread messages — for every role ────────────────────────────
    {
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)

      let total = 0
      for (const p of (participations || [])) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .gt('created_at', p.last_read_at || '1970-01-01')
          .neq('sender_id', userId)
        total += (count || 0)
      }
      out.messages = total
    }

    // ── Pending waivers — admin & principal only (the approvers) ────
    if (role === 'admin' || role === 'principal') {
      const { count } = await supabase
        .from('waiver_requests')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('status', 'pending')
      out.waivers = count || 0
    }

    // ── Overdue fees — admin, bursar, principal ─────────────────────
    if (role === 'admin' || role === 'bursar' || role === 'principal') {
      const today = new Date().toISOString().slice(0, 10)
      const { data: rows } = await supabase
        .from('fee_ledger')
        .select('amount_due, amount_paid, amount_waived, due_date')
        .eq('school_id', school_id)
        .lt('due_date', today)

      out.fees = (rows || []).filter(r => {
        const balance = Number(r.amount_due) - Number(r.amount_paid || 0) - Number(r.amount_waived || 0)
        return balance > 0
      }).length
    }

    // ── Attendance alerts — admin & principal ───────────────────────
    if (role === 'admin' || role === 'principal') {
      // Current month, learners below 80%
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

      const { data: marks } = await supabase
        .from('attendance')
        .select('learner_id, status')
        .eq('school_id', school_id)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      const byLearner = {}
      for (const m of (marks || [])) {
        const key = m.learner_id
        if (!byLearner[key]) byLearner[key] = { present: 0, total: 0 }
        byLearner[key].total++
        if (m.status === 'present' || m.status === 'late') byLearner[key].present++
      }
      out.attendance = Object.values(byLearner).filter(s => s.total >= 5 && (s.present / s.total) < 0.8).length
    }

    res.json(out)
  } catch (err) {
    console.error('sidebar-counts error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
