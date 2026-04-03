import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Floating icon definitions — school themed
const ICONS = [
  { emoji: '📚', size: 28 }, { emoji: '✏️', size: 22 }, { emoji: '🎓', size: 30 },
  { emoji: '📐', size: 20 }, { emoji: '🔬', size: 26 }, { emoji: '📝', size: 22 },
  { emoji: '🏫', size: 32 }, { emoji: '🌍', size: 26 }, { emoji: '📊', size: 22 },
  { emoji: '🧮', size: 24 }, { emoji: '📏', size: 20 }, { emoji: '🎨', size: 24 },
  { emoji: '📚', size: 18 }, { emoji: '✏️', size: 30 }, { emoji: '🎓', size: 20 },
  { emoji: '🔭', size: 26 }, { emoji: '📖', size: 22 }, { emoji: '🖊️', size: 18 },
]

function FloatingIcon({ emoji, size, left, delay, duration }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${left}%`,
      bottom: '-60px',
      fontSize: size,
      opacity: 0.18,
      animation: `floatUp ${duration}s ${delay}s infinite linear`,
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      {emoji}
    </div>
  )
}

const CSS_ANIM = `
@keyframes floatUp {
  0%   { transform: translateY(0)   rotate(0deg);   opacity: 0; }
  10%  { opacity: 0.18; }
  90%  { opacity: 0.18; }
  100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const icons = ICONS.map((ic, i) => ({
    ...ic,
    left: (i * 5.5 + Math.sin(i) * 3 + 2) % 95,
    delay: (i * 1.3) % 12,
    duration: 12 + (i % 6) * 2,
  }))

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS_ANIM}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a3a6b 0%, #1d4ed8 50%, #1e40af 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '20px'
      }}>
        {/* Floating icons */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {icons.map((ic, i) => <FloatingIcon key={i} {...ic} />)}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '44px 40px',
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.5s ease both'
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4ed8', letterSpacing: '-1px', lineHeight: 1 }}>
              Skolo
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>
              One platform. Whole school.
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
            Sign in to your school
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', padding: '11px 14px',
              borderRadius: 10, fontSize: 13, marginBottom: 20,
              border: '1px solid #fecaca', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email address
            </label>
            <input
              name="email" type="email" value={form.email} onChange={handle} required
              style={{
                width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 16,
                transition: 'border-color 0.15s', boxSizing: 'border-box'
              }}
            />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input
              name="password" type="password" value={form.password} onChange={handle} required
              style={{
                width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 24,
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#93c5fd' : '#1d4ed8',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.3px', transition: 'background 0.15s'
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#94a3b8' }}>
            New school?{' '}
            <Link to="/register" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
              Register here
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
