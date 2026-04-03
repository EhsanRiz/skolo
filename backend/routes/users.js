const express  = require('express')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')
const { sendInviteEmail } = require('../lib/email')

const router = express.Router()
router.use(auth)

const APP_URL = process.env.FRONTEND_URL || 'https://skolo.pages.dev'

// ─── GET /users ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, password_set, created_at')
      .eq('school_id', req.user.school_id)
      .order('created_at')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── POST /users — invite a new staff member ──────────────────
router.post('/', async (req, res) => {
  const { full_name, email, role } = req.body
  if (!full_name || !email) {
    return res.status(400).json({ error: 'Name and email are required' })
  }
  try {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).eq('school_id', req.user.school_id)
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' })
    }

    const invite_token      = crypto.randomBytes(24).toString('hex')
    const invite_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        full_name, email,
        role:             role || 'bursar',
        school_id:        req.user.school_id,
        password_hash:    'INVITE_PENDING',
        password_set:     false,
        invite_token,
        invite_expires_at,
        is_active:        true
      })
      .select('id, full_name, email, role, is_active, password_set')
      .single()
    if (error) throw error

    const { data: school } = await supabase
      .from('schools').select('name').eq('id', req.user.school_id).single()

    const inviteUrl   = `${APP_URL}/set-password/${invite_token}`
    const emailResult = await sendInviteEmail({
      to: email, fullName: full_name,
      role: role || 'bursar', schoolName: school?.name || 'School', inviteUrl
    })

    res.status(201).json({
      ...user,
      invite_sent: emailResult.sent,
      invite_url:  inviteUrl
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── POST /users/:id/resend-invite ────────────────────────────
router.post('/:id/resend-invite', async (req, res) => {
  try {
    const invite_token      = crypto.randomBytes(24).toString('hex')
    const invite_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data: user, error } = await supabase
      .from('users')
      .update({ invite_token, invite_expires_at })
      .eq('id', req.params.id).eq('school_id', req.user.school_id)
      .select('full_name, email, role').single()
    if (error) throw error

    const { data: school } = await supabase
      .from('schools').select('name').eq('id', req.user.school_id).single()

    const inviteUrl   = `${APP_URL}/set-password/${invite_token}`
    const emailResult = await sendInviteEmail({
      to: user.email, fullName: user.full_name,
      role: user.role, schoolName: school?.name || 'School', inviteUrl
    })

    res.json({ sent: emailResult.sent, invite_url: inviteUrl })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── PATCH /users/:id ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const update = { ...req.body }
    if (update.password) {
      update.password_hash = await bcrypt.hash(update.password, 10)
      update.password_set  = true
      delete update.password
    }
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', req.params.id).eq('school_id', req.user.school_id)
      .select('id, full_name, email, role, is_active, password_set').single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
