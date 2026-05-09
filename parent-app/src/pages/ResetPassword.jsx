import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { errMessage } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function ResetPassword() {
  const { token } = useParams()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')

    setLoading(true)
    try {
      await api.post('/parent-auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      toast.error(errMessage(err, 'Failed to reset password'))
    }
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
        <h2 style={{ color: '#1f2937', marginBottom: 8 }}>Password Reset</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Your password has been updated.</p>
        <Link to="/login" style={{ color: '#003049', fontWeight: 500, textDecoration: 'none' }}>Sign In</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#003049', padding: '32px 20px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>New Password</h2>
      </div>
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 15 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 15 }} />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 12, borderRadius: 9, border: 'none',
            background: '#003049', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <div style={{ textAlign:'center', padding:'16px 20px 24px', fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}
