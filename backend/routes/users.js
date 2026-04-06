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

    // Auto-create teacher record when role is teacher
    if ((role || 'bursar') === 'teacher') {
      await supabase.from('teachers').insert({
        school_id:  req.user.school_id,
        full_name,
        email,
        is_active:  true,
        user_id:    user.id
      }).select().single()
      // Assign reference number
      const { nextRefNo } = require('../lib/sequences')
      const ref_no = await nextRefNo(req.user.school_id, 'teacher')
      await supabase.from('teachers').update({ reference_no: ref_no })
        .eq('user_id', user.id).eq('school_id', req.user.school_id)
    }

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

// ─── POST /users/invite-parent — invite a guardian to create parent account ──
router.post('/invite-parent', async (req, res) => {
  try {
    const { guardian_id } = req.body
    if (!guardian_id) return res.status(400).json({ error: 'Guardian ID required' })

    // Get guardian
    const { data: guardian, error: gErr } = await supabase
      .from('guardians')
      .select('*')
      .eq('id', guardian_id)
      .eq('school_id', req.user.school_id)
      .single()

    if (gErr || !guardian) return res.status(404).json({ error: 'Guardian not found' })
    if (guardian.user_id) return res.status(400).json({ error: 'Guardian already has a parent account' })

    // Generate invite token
    const invite_token = crypto.randomBytes(24).toString('hex')
    const PARENT_URL = process.env.PARENT_APP_URL || 'https://parent.myskolo.co.za'

    await supabase
      .from('guardians')
      .update({ invite_token, invite_sent_at: new Date().toISOString() })
      .eq('id', guardian_id)

    // Get school name
    const { data: school } = await supabase
      .from('schools').select('name').eq('id', req.user.school_id).single()

    // Send invite email
    const inviteUrl = `${PARENT_URL}/set-password/${invite_token}`
    if (guardian.email) {
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Skolo <noreply@4dcs.co.za>',
        to: guardian.email,
        subject: `${school?.name || 'Your school'} invites you to Skolo Parent`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #0f2044; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">Skolo Parent</h2>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #e2e8f0;">
              <p>Hi ${guardian.first_name},</p>
              <p><strong>${school?.name}</strong> has invited you to join the Skolo Parent portal. You'll be able to view your child's fees, attendance, announcements, and communicate with the school.</p>
              <a href="${inviteUrl}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Set Up Your Account</a>
              <p style="color: #64748b; font-size: 13px;">If you didn't expect this email, you can safely ignore it.</p>
            </div>
          </div>
        `
      })
    }

    res.json({ success: true, invite_url: inviteUrl, email_sent: !!guardian.email })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── POST /users/bulk-invite-parents — invite all guardians without accounts ──
router.post('/bulk-invite-parents', async (req, res) => {
  try {
    // Get all guardians without user accounts
    const { data: guardians } = await supabase
      .from('guardians')
      .select('id, first_name, last_name, email, phone, user_id')
      .eq('school_id', req.user.school_id)
      .is('user_id', null)

    if (!guardians || guardians.length === 0) {
      return res.json({ invited: 0, message: 'All guardians already have accounts' })
    }

    const { data: school } = await supabase
      .from('schools').select('name').eq('id', req.user.school_id).single()

    const PARENT_URL = process.env.PARENT_APP_URL || 'https://parent.myskolo.co.za'
    let invited = 0
    let emailsSent = 0

    for (const guardian of guardians) {
      const invite_token = crypto.randomBytes(24).toString('hex')
      await supabase
        .from('guardians')
        .update({ invite_token, invite_sent_at: new Date().toISOString() })
        .eq('id', guardian.id)

      if (guardian.email) {
        const inviteUrl = `${PARENT_URL}/set-password/${invite_token}`
        try {
          const { Resend } = require('resend')
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: 'Skolo <noreply@4dcs.co.za>',
            to: guardian.email,
            subject: `${school?.name || 'Your school'} invites you to Skolo Parent`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: #0f2044; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">Skolo Parent</h2>
                </div>
                <div style="padding: 24px; background: #fff; border: 1px solid #e2e8f0;">
                  <p>Hi ${guardian.first_name},</p>
                  <p><strong>${school?.name}</strong> has invited you to Skolo Parent. View your child's fees, attendance, and more.</p>
                  <a href="${inviteUrl}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Set Up Your Account</a>
                </div>
              </div>
            `
          })
          emailsSent++
        } catch (e) { /* continue on email failure */ }
      }
      invited++
    }

    res.json({ invited, emails_sent: emailsSent, total_guardians: guardians.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── DELETE /users/:id — remove a staff account ──────────────
router.delete('/:id', async (req, res) => {
  const school_id = req.user.school_id
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .eq('school_id', school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
