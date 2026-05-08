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
        <h2 style={{ color: '#1f2937', marginBottom: 8 }}>Check your email</h2>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          If an account exists with that email, we've sent a password reset link.
        </p>
        <Link to="/login" style={{ color: '#003049', textDecoration: 'none', fontWeight: 500 }}>Back to Login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#003049', padding: '32px 20px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Reset Password</h2>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>We'll send you a reset link</p>
      </div>
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 15 }} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 12, borderRadius: 9, border: 'none',
            background: '#003049', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#003049', fontSize: 13, textDecoration: 'none' }}>Back to Login</Link>
        </div>
        <div style={{ textAlign:'center', padding:'16px 20px 24px', fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}
