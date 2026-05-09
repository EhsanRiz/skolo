import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { errMessage } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function SetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [guardian, setGuardian] = useState(null)
  const [school, setSchool] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    verifyToken()
  }, [token])

  async function verifyToken() {
    try {
      const { data } = await api.get(`/parent-auth/verify-invite/${token}`)
      setGuardian(data.guardian)
      setSchool(data.school)
    } catch (err) {
      setError('This invite link is invalid or has already been used.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')

    setSubmitting(true)
    try {
      const { data } = await api.post('/parent-auth/set-password', { token, password })
      localStorage.setItem('sk_parent_token', data.token)
      localStorage.setItem('sk_parent_user', JSON.stringify(data.user))
      toast.success('Account created! Welcome to Skolo Parent.')
      window.location.href = '/dashboard'
    } catch (err) {
      toast.error(errMessage(err, 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Verifying invite...</div>

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>:(</div>
      <h2 style={{ color: '#1f2937', marginBottom: 8 }}>Invalid Invite</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>{error}</p>
      <a href="/login" style={{ color: '#003049', textDecoration: 'none', fontWeight: 500 }}>Go to Login</a>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#003049', padding: '32px 20px 24px', textAlign: 'center', color: '#fff' }}>
        {school?.logo_url && <img src={school.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, marginBottom: 8 }} />}
        <h2 style={{ margin: 0, fontSize: 18 }}>{school?.name || 'Skolo Parent'}</h2>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>Set up your parent account</p>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <div style={{ background: '#e6eff5', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 14 }}>
          Welcome, <strong>{guardian?.first_name} {guardian?.last_name}</strong>! Create a password to access your parent portal.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
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
          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: 12, borderRadius: 9, border: 'none',
            background: '#003049', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: submitting ? 0.6 : 1
          }}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div style={{ textAlign:'center', padding:'16px 20px 24px', fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}
