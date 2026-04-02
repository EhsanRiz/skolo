const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── GET /events ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .eq('school_id', req.user.school_id)
      .order('event_date')

    // Optional date range filters
    if (req.query.from) query = query.gte('event_date', req.query.from)
    if (req.query.to)   query = query.lte('event_date', req.query.to)

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /events ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...req.body, school_id: req.user.school_id, created_by: req.user.id })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PATCH /events/:id ───────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
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

// ─── DELETE /events/:id ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('events')
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
