const express = require('express')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// ─── GET /schools/me ─────────────────────────────────────────
// Returns current school with country + region detail
router.get('/me', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        *,
        countries ( code, name, currency_code, currency_symbol, phone_prefix ),
        regions   ( name, level )
      `)
      .eq('id', req.user.school_id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /schools/countries ──────────────────────────────────
// Public — used on registration form
router.get('/countries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /schools/regions/:country_id ────────────────────────
// Public — used on registration form after country selected
router.get('/regions/:country_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('country_id', req.params.country_id)
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

// ─── PATCH /schools/me ───────────────────────────────────────
router.patch('/me', auth, async (req, res) => {
  const allowed = ['name', 'phone', 'email', 'school_reg_number', 'address']
  const update = {}
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k] })
  try {
    const { data, error } = await supabase
      .from('schools')
      .update(update)
      .eq('id', req.user.school_id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
