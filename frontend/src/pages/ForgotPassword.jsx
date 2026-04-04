import { useState } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      })
      setSent(true) // Always show success — never reveal if email exists
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: '#0f2044', borderRadius: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>S</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2044', letterSpacing: '-0.5px' }}>Skolo</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>One platform. Whole school.</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Check your inbox</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                The link expires in 1 hour.
              </div>
              <Link to="/login" style={{ display: 'inline-block', padding: '10px 24px', background: '#0f2044', color: '#fff', borderRadius: 9, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                Back to login →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Account recovery</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Forgot your password?</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Enter your email and we'll send you a reset link.</div>
              </div>

              <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@school.ac.ls"
                  autoFocus
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', marginBottom: error ? 8 : 20, boxSizing: 'border-box' }}
                />

                {error && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, background: loading ? '#4b6a9e' : '#0f2044', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s' }}>
                  {loading ? 'Sending…' : 'Send reset link →'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link to="/login" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Back to login</Link>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#94a3b8' }}>
          Developed by 4D Climate Solutions
        </div>
      </div>
    </div>
  )
}
