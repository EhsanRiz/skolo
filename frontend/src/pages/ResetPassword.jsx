import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ResetPassword() {
  const { token }  = useParams()
  const navigate   = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const strength = pw => {
    if (!pw) return null
    if (pw.length < 8)  return { label: 'Too short', color: '#dc2626', width: '20%' }
    if (pw.length < 10) return { label: 'Weak',      color: '#f7c548', width: '40%' }
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Fair', color: '#f7c548', width: '60%' }
    return { label: 'Strong', color: '#16a34a', width: '100%' }
  }
  const pw = strength(password)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')

    setLoading(true)
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Reset failed')

      // Auto-login — same pattern as SetPassword
      localStorage.setItem('sk_token', data.token)
      localStorage.setItem('sk_user',  JSON.stringify(data.user))
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: '#003049', borderRadius: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>S</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#003049', letterSpacing: '-0.5px' }}>Skolo</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>One platform. Whole school.</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>

          {success ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#16a34a', marginBottom: 8 }}>Password updated!</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>Taking you to your dashboard…</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Account recovery</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', marginBottom: 4 }}>Set a new password</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Choose something strong — at least 8 characters.</div>
              </div>

              <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>New password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                />
                {pw && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ height: 4, background: '#f7f7f7', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: pw.width, background: pw.color, borderRadius: 4, transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: pw.color, fontWeight: 600 }}>{pw.label}</div>
                  </div>
                )}

                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm password *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${confirm && confirm !== password ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 9, fontSize: 14, outline: 'none', marginBottom: confirm && confirm !== password ? 6 : 20, boxSizing: 'border-box' }}
                />
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 14 }}>Passwords do not match</div>
                )}

                {error && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
                )}

                <button type="submit" disabled={loading || !password || !confirm}
                  style={{ width: '100%', padding: 13, background: loading ? '#4b6a9e' : '#003049', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s' }}>
                  {loading ? 'Saving…' : 'Set new password & sign in →'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}
