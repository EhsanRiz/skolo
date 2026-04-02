const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── GRADES ──────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*, classes(*)')
      .eq('school_id', req.user.school_id)
      .order('display_order')
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .insert({ ...req.body, school_id: req.user.school_id })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── CLASSES ─────────────────────────────────────────────────

router.post('/classes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert({ ...req.body, school_id: req.user.school_id })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/classes/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('classes')
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
