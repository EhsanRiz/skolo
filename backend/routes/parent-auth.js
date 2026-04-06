const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const supabase = require('../lib/supabase')
const { sendParentInviteEmail } = require('../lib/email')

// POST /parent-auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'parent')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    if (!user.password_hash) return res.status(401).json({ error: 'Please set your password using the invite link' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user.id, school_id: user.school_id, role: 'parent', email: user.email, guardian_id: user.guardian_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Log login
    supabase.from('login_logs').insert({
      user_id: user.id, school_id: user.school_id,
      ip_address: req.ip, user_agent: req.headers['user-agent']
    }).then(() => {})

    res.json({
      token,
      user: {
        id: user.id, full_name: user.full_name, email: user.email,
        role: 'parent', school_id: user.school_id, guardian_id: user.guardian_id
      }
    })
  } catch (err) {
    console.error('Parent login error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /parent-auth/verify-invite/:token — check invite validity
router.get('/verify-invite/:token', async (req, res) => {
  try {
    const { data: guardian, error } = await supabase
      .from('guardians')
      .select('id, first_name, last_name, email, phone, school_id')
      .eq('invite_token', req.params.token)
      .maybeSingle()

    if (error) throw error
    if (!guardian) return res.status(404).json({ error: 'Invalid or expired invite link' })

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, logo_url')
      .eq('id', guardian.school_id)
      .single()

    res.json({ guardian, school })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /parent-auth/set-password — complete invite + create parent account
router.post('/set-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    // Find guardian by invite token
    const { data: guardian, error: gErr } = await supabase
      .from('guardians')
      .select('*')
      .eq('invite_token', req.params?.token || token)
      .maybeSingle()

    if (gErr) throw gErr
    if (!guardian) return res.status(404).json({ error: 'Invalid or expired invite link' })

    // Check if parent user already exists
    if (guardian.user_id) {
      return res.status(400).json({ error: 'Account already set up. Please login.' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const email = (guardian.email || '').toLowerCase().trim()

    // Check email not already taken
    if (email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (existing) return res.status(400).json({ error: 'An account with this email already exists' })
    }

    // Create parent user
    const { data: newUser, error: uErr } = await supabase
      .from('users')
      .insert({
        school_id: guardian.school_id,
        full_name: `${guardian.first_name} ${guardian.last_name}`,
        email: email || `parent_${guardian.id.slice(0, 8)}@skolo.local`,
        password_hash,
        role: 'parent',
        guardian_id: guardian.id,
        is_active: true,
        password_set: true
      })
      .select()
      .single()

    if (uErr) throw uErr

    // Link guardian to user + clear invite token
    await supabase
      .from('guardians')
      .update({ user_id: newUser.id, invite_token: null })
      .eq('id', guardian.id)

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: newUser.id, school_id: newUser.school_id, role: 'parent', email: newUser.email, guardian_id: guardian.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token: jwtToken,
      user: {
        id: newUser.id, full_name: newUser.full_name, email: newUser.email,
        role: 'parent', school_id: newUser.school_id, guardian_id: guardian.id
      }
    })
  } catch (err) {
    console.error('Parent set-password error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /parent-auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, school_id')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'parent')
      .maybeSingle()

    // Always return success (don't reveal if email exists)
    if (!user) return res.json({ sent: true })

    const token = crypto.randomBytes(24).toString('hex')
    const expires_at = new Date(Date.now() + 3600000).toISOString() // 1 hour

    await supabase.from('reset_tokens').insert({
      user_id: user.id, token, expires_at
    })

    // Send reset email
    const resetLink = `${process.env.PARENT_APP_URL || process.env.FRONTEND_URL}/reset-password/${token}`
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Skolo <noreply@4dcs.co.za>',
      to: user.email,
      subject: 'Reset your Skolo Parent password',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #0f2044; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Skolo Parent</h2>
          </div>
          <div style="padding: 24px; background: #fff; border: 1px solid #e2e8f0;">
            <p>Hi ${user.full_name},</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
            <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour.</p>
          </div>
        </div>
      `
    })

    res.json({ sent: true })
  } catch (err) {
    console.error('Parent forgot-password error:', err)
    res.json({ sent: true }) // Always 200
  }
})

// POST /parent-auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const { data: resetToken } = await supabase
      .from('reset_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!resetToken) return res.status(400).json({ error: 'Invalid or expired reset link' })

    const password_hash = await bcrypt.hash(password, 10)

    await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', resetToken.user_id)

    // Delete used token
    await supabase.from('reset_tokens').delete().eq('id', resetToken.id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
