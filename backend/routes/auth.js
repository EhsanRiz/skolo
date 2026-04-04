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

// ─── POST /auth/set-password — from invite email link ────────
router.post('/set-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  try {
    // Find user by token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, school_id, invite_expires_at')
      .eq('invite_token', token)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid or expired invite link' })
    }
    if (new Date(user.invite_expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invite link has expired. Ask your admin to resend the invite.' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    await supabase.from('users').update({
      password_hash,
      password_set:     true,
      invite_token:     null,
      invite_expires_at: null
    }).eq('id', user.id)

    // If teacher role — ensure teacher record exists and is linked
    if (user.role === 'teacher') {
      const { data: existing } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .maybeSingle()

      if (!existing) {
        // Get user full_name and email
        const { data: fullUser } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        const { data: newTeacher } = await supabase
          .from('teachers')
          .insert({
            school_id: user.school_id,
            full_name: fullUser?.full_name || 'Teacher',
            email: fullUser?.email,
            is_active: true,
            user_id: user.id
          })
          .select('id')
          .single()

        if (newTeacher) {
          const { nextRefNo } = require('../lib/sequences')
          const ref_no = await nextRefNo(user.school_id, 'teacher')
          await supabase.from('teachers')
            .update({ reference_no: ref_no })
            .eq('id', newTeacher.id)
        }
      }
    }

    // Auto-login: return a JWT so they go straight to dashboard
    const jwt = require('jsonwebtoken')
    const token_jwt = jwt.sign(
      { id: user.id, school_id: user.school_id, role: user.role, email: user.email, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({ token: token_jwt, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, school_id: user.school_id } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── GET /auth/verify-invite — check token validity ──────────
router.get('/verify-invite/:token', async (req, res) => {
  try {
    const token = req.params.token
    if (!token || token.length < 10) {
      return res.status(400).json({ valid: false, error: 'Invalid token format' })
    }

    // Use maybeSingle() to avoid throwing when not found
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, full_name, email, role, invite_expires_at, school_id, is_active, password_set')
      .eq('invite_token', token)
      .maybeSingle()

    if (uErr) {
      console.error('verify-invite DB error:', uErr.message)
      return res.status(500).json({ valid: false, error: uErr.message })
    }
    if (!user) {
      return res.status(404).json({ valid: false, error: 'Invite link not found — it may have already been used or expired' })
    }
    if (!user.is_active) {
      return res.status(400).json({ valid: false, error: 'This account has been disabled' })
    }
    if (user.password_set) {
      return res.status(400).json({ valid: false, error: 'Password already set — please log in normally' })
    }
    if (!user.invite_expires_at || new Date(user.invite_expires_at) < new Date()) {
      return res.status(400).json({ valid: false, error: 'This invite link has expired — ask your admin to resend it' })
    }

    // Get school name separately to avoid join issues
    const { data: school } = await supabase
      .from('schools').select('name').eq('id', user.school_id).maybeSingle()

    res.json({
      valid:       true,
      full_name:   user.full_name,
      email:       user.email,
      role:        user.role,
      school_name: school?.name || 'Your school'
    })
  } catch (err) {
    console.error('verify-invite unexpected error:', err.message)
    res.status(500).json({ valid: false, error: 'Server error: ' + err.message })
  }
})

module.exports = router
