const express = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// GET /fee-plans
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_plans')
      .select('*, grades(name)')
      .eq('school_id', req.user.school_id)
      .order('year', { ascending: false })
      .order('created_at')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /fee-plans
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_plans')
      .insert({ ...req.body, school_id: req.user.school_id })
      .select('*, grades(name)')
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /fee-plans/:id
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fee_plans')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .select('*, grades(name)')
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /fee-plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('fee_plans')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
