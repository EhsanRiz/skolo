const express = require('express')
const supabase = require('../lib/supabase')
const { Resend } = require('resend')

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Skolo <noreply@myskolo.co.za>'
const FALLBACK_FROM = 'onboarding@resend.dev'

/**
 * POST / - Receive a demo request, save to database, and send email notification
 */
router.post('/', async (req, res) => {
  const { full_name, email, phone, school_name, country, message } = req.body

  // Validate required fields
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required' })
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  if (!school_name || !school_name.trim()) {
    return res.status(400).json({ error: 'School name is required' })
  }

  try {
    // 1. Insert into demo_requests table
    const { data: demoRequest, error: insertError } = await supabase
      .from('demo_requests')
      .insert({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        school_name: school_name.trim(),
        country: country || 'South Africa',
        message: message?.trim() || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return res.status(500).json({ error: 'Failed to save demo request' })
    }

    // 2. Send email notification
    const emailHtml = generateDemoRequestEmail({
      fullName: full_name,
      email,
      phone: phone || 'Not provided',
      schoolName: school_name,
      country: country || 'South Africa',
      message: message || 'No additional notes'
    })

    try {
      await resend.emails.send({
        from: FROM,
        to: 'sehsan.rizvi@gmail.com',
        subject: `New Demo Request: ${school_name}`,
        html: emailHtml
      })
    } catch (emailErr) {
      // If custom domain isn't set up, try with fallback
      console.warn('Primary email failed, trying fallback:', emailErr.message)
      try {
        await resend.emails.send({
          from: FALLBACK_FROM,
          to: 'sehsan.rizvi@gmail.com',
          subject: `New Demo Request: ${school_name}`,
          html: emailHtml
        })
      } catch (fallbackErr) {
        console.error('Email send failed (both attempts):', fallbackErr.message)
        // Don't fail the API response if email fails
      }
    }

    // 3. Return success
    return res.json({
      success: true,
      message: 'Demo request submitted'
    })
  } catch (err) {
    console.error('Demo request error:', err)
    return res.status(500).json({ error: 'Failed to process demo request' })
  }
})

/**
 * Generate HTML email for demo request notification
 */
function generateDemoRequestEmail({ fullName, email, phone, schoolName, country, message }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#0f2044;padding:28px 32px">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">Skolo</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">One platform. Whole school.</div>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <div style="font-size:13px;color:#64748b;margin-bottom:6px">Demo Request</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:24px">
        New demo request from ${schoolName}
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px">
        A school has requested a demo of Skolo. Here are the details:
      </p>

      <!-- Details Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Full Name</div>
            <div style="font-size:15px;font-weight:600;color:#0f172a">${escapeHtml(fullName)}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Email</div>
            <div style="font-size:14px;color:#0f172a"><a href="mailto:${escapeHtml(email)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(email)}</a></div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">School Name</div>
            <div style="font-size:15px;font-weight:600;color:#0f172a">${escapeHtml(schoolName)}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Country</div>
            <div style="font-size:14px;color:#0f172a">${escapeHtml(country)}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Phone</div>
            <div style="font-size:14px;color:#0f172a">${escapeHtml(phone)}</div>
          </div>
        </div>

        ${message && message !== 'No additional notes' ? `
        <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:20px">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Message/Notes</div>
          <div style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</div>
        </div>
        ` : ''}
      </div>

      <p style="font-size:13px;color:#64748b;margin:0;font-style:italic">
        This is an automated notification. Reply to this email or reach out to the contact directly to follow up.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center">
        Skolo Demo Requests · Powered by Skolo
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

module.exports = router
