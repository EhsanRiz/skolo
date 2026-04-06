import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/parent-auth/forgot-password', { email })
      setSent(true)
    } catch {}
    setLoading(false)
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#9993;</div>
        <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Check your email</h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          If an account exists with that email, we've sent a password reset link.
        </p>
        <Link to="/login" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 500 }}>Back to Login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0f2044', padding: '32px 20px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Reset Password</h2>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>We'll send you a reset link</p>
      </div>
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 15 }} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 12, borderRadius: 9, border: 'none',
            background: '#1d4ed8', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#1d4ed8', fontSize: 13, textDecoration: 'none' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
