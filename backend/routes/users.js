const express = require('express')
const bcrypt = require('bcryptjs')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── GET /users ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('school_id', req.user.school_id)
      .order('created_at')
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /users ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { full_name, email, password, role } = req.body
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' })
  }
  try {
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('users')
      .insert({ full_name, email, password_hash, role: role || 'bursar', school_id: req.user.school_id })
      .select('id, full_name, email, role, is_active')
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PATCH /users/:id ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const update = { ...req.body }
    // If password provided, hash it
    if (update.password) {
      update.password_hash = await bcrypt.hash(update.password, 10)
      delete update.password
    }
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .select('id, full_name, email, role, is_active')
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
