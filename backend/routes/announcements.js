const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── GET /announcements ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', req.user.school_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /announcements ─────────────────────────────────────
// Creates announcement and optionally triggers SMS blast
router.post('/', async (req, res) => {
  const school_id = req.user.school_id
  const { title, body, target, target_id, send_sms } = req.body

  try {
    // 1. Save announcement
    const { data: announcement, error: aErr } = await supabase
      .from('announcements')
      .insert({ title, body, target, target_id, send_sms, school_id, created_by: req.user.id })
      .select()
      .single()

    if (aErr) throw aErr

    // 2. If SMS requested, collect recipient phone numbers
    if (send_sms) {
      let guardianQuery = supabase
        .from('guardians')
        .select('phone, learner_guardians!inner(learner_id, learners!inner(school_id, class_id, is_active))')
        .eq('learner_guardians.learners.school_id', school_id)
        .eq('learner_guardians.learners.is_active', true)

      // Filter by class if targeted
      if (target === 'class' && target_id) {
        guardianQuery = guardianQuery.eq('learner_guardians.learners.class_id', target_id)
      }

      const { data: guardians, error: gErr } = await guardianQuery
      if (gErr) throw gErr

      // Deduplicate phone numbers
      const phones = [...new Set(guardians.map(g => g.phone).filter(Boolean))]

      // 3. Log SMS entries (actual sending via Africa's Talking added in next step)
      const smsEntries = phones.map(phone => ({
        school_id,
        recipient_phone: phone,
        message: `${title}: ${body}`,
        status: 'pending'
      }))

      if (smsEntries.length > 0) {
        await supabase.from('sms_log').insert(smsEntries)
      }

      return res.status(201).json({ announcement, sms_queued: phones.length })
    }

    res.status(201).json({ announcement, sms_queued: 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /announcements/:id ───────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
