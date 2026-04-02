const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../lib/supabase')

const router = express.Router()

// ─── POST /auth/register-school ─────────────────────────────
// Creates a school + first admin user in one transaction
router.post('/register-school', async (req, res) => {
  const { school, admin } = req.body

  // school: { name, country_id, region_id, address, phone, email, school_reg_number }
  // admin:  { full_name, email, password }

  if (!school?.name || !admin?.email || !admin?.password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // 1. Create school
    const { data: newSchool, error: schoolErr } = await supabase
      .from('schools')
      .insert({
        name: school.name,
        country_id: school.country_id,
        region_id: school.region_id,
        address: school.address || null,
        phone: school.phone || null,
        email: school.email || null,
        school_reg_number: school.school_reg_number || null,
        subscription_status: 'trial'
      })
      .select()
      .single()

    if (schoolErr) throw schoolErr

    // 2. Hash password and create admin user
    const password_hash = await bcrypt.hash(admin.password, 10)

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({
        school_id: newSchool.id,
        full_name: admin.full_name,
        email: admin.email,
        password_hash,
        role: 'admin'
      })
      .select()
      .single()

    if (userErr) throw userErr

    // 3. Sign JWT
    const token = jwt.sign(
      { id: newUser.id, school_id: newSchool.id, role: newUser.role, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: newUser.id, full_name: newUser.full_name, email: newUser.email, role: newUser.role },
      school: { id: newSchool.id, name: newSchool.name }
    })
  } catch (err) {
    console.error('register-school error:', err)
    res.status(500).json({ error: err.message || 'Registration failed' })
  }
})

// ─── POST /auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, school_id, full_name, email, password_hash, role, is_active')
      .eq('email', email)
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' })
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, school_id: user.school_id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, school_id: user.school_id }
    })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

module.exports = router
