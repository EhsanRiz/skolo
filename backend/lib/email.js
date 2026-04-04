const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Skolo <noreply@4dcs.co.za>'

/**
 * Send a waiver request email to the principal/admin
 */
async function sendWaiverRequestEmail({ to, principalName, bursarName, learnerName,
  amount, sym, reason, note, schoolName, appUrl, waiverId }) {

  const approveUrl = `${appUrl}/waivers`
  const rejectUrl  = `${appUrl}/waivers`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#0f2044;padding:28px 32px">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">Skolo</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">One platform. Whole school.</div>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <div style="font-size:13px;color:#64748b;margin-bottom:6px">Fee waiver request</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:20px">
        ${schoolName} — action required
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px">
        Hi ${principalName},<br><br>
        <strong>${bursarName}</strong> has requested a fee waiver that requires your approval.
      </p>

      <!-- Waiver details -->
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Learner</div>
            <div style="font-size:15px;font-weight:700;color:#0f172a">${learnerName}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Amount to waive</div>
            <div style="font-size:20px;font-weight:900;color:#7c3aed">${sym}${Number(amount).toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Reason</div>
            <div style="font-size:14px;font-weight:600;color:#374151">${reason}</div>
          </div>
          ${note ? `<div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Note</div>
            <div style="font-size:13px;color:#64748b">${note}</div>
          </div>` : ''}
        </div>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0 0 24px">
        Click below to log in to Skolo and review this request. You'll see it in your notification bell 🔔 on the dashboard.
      </p>

      <!-- CTA -->
      <a href="${approveUrl}" style="display:block;text-align:center;background:#0f2044;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 24px;border-radius:10px;margin-bottom:12px">
        Review in Skolo →
      </a>

      <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0">
        You can approve or reject from your Skolo dashboard after logging in.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center">
        ${schoolName} · Powered by Skolo · Developed by 4D Climate Solutions
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `⏳ Waiver request — ${learnerName} · ${sym}${Number(amount).toLocaleString()} · ${schoolName}`,
      html
    })
    return { sent: true }
  } catch (err) {
    console.error('Email send failed:', err.message)
    return { sent: false, error: err.message }
  }
}

/**
 * Send approval/rejection notification to bursar
 */
async function sendWaiverDecisionEmail({ to, bursarName, learnerName, amount, sym,
  approved, reviewNote, schoolName, appUrl }) {

  const color  = approved ? '#16a34a' : '#dc2626'
  const label  = approved ? '✓ Approved' : '✗ Rejected'
  const emoji  = approved ? '✅' : '❌'

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0f2044;padding:28px 32px">
      <div style="font-size:22px;font-weight:900;color:#fff">Skolo</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">One platform. Whole school.</div>
    </div>
    <div style="padding:32px">
      <div style="font-size:13px;color:#64748b;margin-bottom:6px">Waiver decision</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:20px">${emoji} Waiver ${approved ? 'approved' : 'rejected'}</div>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px">
        Hi ${bursarName},<br><br>
        Your waiver request for <strong>${learnerName}</strong> (${sym}${Number(amount).toLocaleString()}) has been <strong style="color:${color}">${approved?'approved':'rejected'}</strong>.
      </p>
      ${reviewNote ? `<div style="background:#f8fafc;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#374151"><strong>Note from approver:</strong><br>${reviewNote}</div>` : ''}
      <a href="${appUrl}/fees" style="display:block;text-align:center;background:#0f2044;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 24px;border-radius:10px;margin-bottom:12px">View in Skolo →</a>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center">${schoolName} · Powered by Skolo</p>
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `${emoji} Waiver ${approved?'approved':'rejected'} — ${learnerName} · ${schoolName}`,
      html
    })
    return { sent: true }
  } catch (err) {
    console.error('Email send failed:', err.message)
    return { sent: false, error: err.message }
  }
}


/**
 * Send a staff invite email with a set-password link
 */
async function sendInviteEmail({ to, fullName, role, schoolName, inviteUrl }) {
  const roleLabel = { admin:'Admin', principal:'Principal', bursar:'Bursar', teacher:'Teacher' }[role] || role

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0f2044;padding:28px 32px">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">Skolo</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">One platform. Whole school.</div>
    </div>
    <div style="padding:32px">
      <div style="font-size:13px;color:#64748b;margin-bottom:6px">You've been invited</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:20px">Welcome to Skolo, ${fullName}</div>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px">
        You have been added as <strong>${roleLabel}</strong> at <strong>${schoolName}</strong>.<br><br>
        Click the button below to set your password and access your account. This link expires in <strong>48 hours</strong>.
      </p>
      <a href="${inviteUrl}" style="display:block;text-align:center;background:#0f2044;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 24px;border-radius:10px;margin-bottom:16px">
        Set my password →
      </a>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
        If you didn't expect this, you can ignore this email.
      </p>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center">
        ${schoolName} · Powered by Skolo · Developed by 4D Climate Solutions
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `You've been invited to Skolo — ${schoolName}`,
      html
    })
    return { sent: true }
  } catch (err) {
    console.error('Invite email failed:', err.message)
    return { sent: false, error: err.message }
  }
}

/**
 * Send a password reset email
 */
async function sendPasswordReset({ to, fullName, resetLink }) {
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0f2044;padding:28px 32px">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">Skolo</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">One platform. Whole school.</div>
    </div>
    <div style="padding:32px">
      <div style="font-size:13px;color:#64748b;margin-bottom:6px">Password reset</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:20px">Reset your password</div>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px">
        Hi ${fullName},<br><br>
        We received a request to reset your Skolo password. Click the button below — this link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetLink}" style="display:block;text-align:center;background:#0f2044;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 24px;border-radius:10px;margin-bottom:16px">
        Reset my password →
      </a>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="font-size:11px;color:#94a3b8;margin:0;text-align:center">
        Powered by Skolo · Developed by 4D Climate Solutions
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: FROM, to,
      subject: 'Reset your Skolo password',
      html
    })
    return { sent: true }
  } catch (err) {
    console.error('Password reset email failed:', err.message)
    return { sent: false, error: err.message }
  }
}

module.exports = { sendWaiverRequestEmail, sendWaiverDecisionEmail, sendInviteEmail, sendPasswordReset }
