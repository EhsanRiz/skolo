import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInstall, setShowInstall] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: '#fff', padding: '36px 20px 20px', textAlign: 'center',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <img src="/skolo-logo-white.svg" alt="Skolo" style={{
          height: 100, objectFit: 'contain', margin: '0 auto 10px', display: 'block'
        }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#003049' }}>Parent Portal</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Stay connected with your child's school</p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your password" required autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            ...btnStyle,
            opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/forgot-password" style={{ color: '#003049', fontSize: 13, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        {/* Install prompt */}
        <div style={{
          marginTop: 32, padding: 16, background: '#e6eff5', borderRadius: 10,
          textAlign: 'center', fontSize: 13, color: '#374151'
        }}>
          <strong style={{ color: '#003049' }}>Add to Home Screen</strong>
          <p style={{ marginTop: 4, lineHeight: 1.4 }}>
            For the best experience, tap the share button in your browser and select "Add to Home Screen".
          </p>
        </div>
        <div style={{ textAlign:'center', padding:'16px 20px 24px', fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #e5e7eb',
  fontSize: 15, outline: 'none', background: '#fff',
  transition: 'border-color 0.15s'
}

const btnStyle = {
  width: '100%', padding: '12px', borderRadius: 9, border: 'none',
  background: '#003049', color: '#fff', fontSize: 15, fontWeight: 600,
  cursor: 'pointer'
}
