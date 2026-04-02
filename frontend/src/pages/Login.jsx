import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  logo: { fontSize: 28, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 },
  tagline: { fontSize: 13, color: '#64748b', marginBottom: 32 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 16,
    transition: 'border-color 0.15s'
  },
  btn: {
    width: '100%', padding: '12px', background: '#1d4ed8', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4
  },
  error: {
    background: '#fef2f2', color: '#dc2626', padding: '10px 14px',
    borderRadius: 8, fontSize: 13, marginBottom: 16
  },
  register: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' },
  link: { color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Skolo</div>
        <div style={s.tagline}>Less admin. More learning.</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={submit}>
          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" value={form.email} onChange={handle} required />
          <label style={s.label}>Password</label>
          <input style={s.input} name="password" type="password" value={form.password} onChange={handle} required />
          <button style={s.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={s.register}>
          New school? <Link to="/register" style={s.link}>Register here</Link>
        </div>
      </div>
    </div>
  )
}
