import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Chalk elements — equations, letters, words, symbols that appear/fade
const CHALK_ITEMS = [
  { text: '2 + 2 = 4',    x: 5,  y: 12, size: 18, rot: -3,  delay: 0   },
  { text: 'Aa Bb Cc',     x: 72, y: 8,  size: 22, rot: 2,   delay: 1.5 },
  { text: 'E = mc²',      x: 15, y: 75, size: 20, rot: -2,  delay: 3   },
  { text: 'A+',           x: 85, y: 65, size: 36, rot: 4,   delay: 0.8 },
  { text: '∑ knowledge',  x: 55, y: 80, size: 16, rot: -1,  delay: 4.5 },
  { text: 'x² + y² = r²', x: 60, y: 20, size: 17, rot: 3,  delay: 2   },
  { text: 'Learn.',        x: 8,  y: 45, size: 26, rot: -4, delay: 5   },
  { text: '1 2 3 4 5',    x: 78, y: 35, size: 18, rot: 2,   delay: 1   },
  { text: 'Grow.',         x: 38, y: 88, size: 24, rot: -2, delay: 6   },
  { text: 'H₂O',          x: 42, y: 5,  size: 22, rot: 1,   delay: 3.5 },
  { text: '√ success',    x: 25, y: 60, size: 17, rot: -3,  delay: 7   },
  { text: 'B+',           x: 90, y: 18, size: 30, rot: -5,  delay: 2.5 },
  { text: 'π ≈ 3.14',     x: 3,  y: 85, size: 16, rot: 2,   delay: 4   },
  { text: 'Inspire.',      x: 65, y: 55, size: 20, rot: 3,  delay: 8   },
  { text: 'abc…xyz',      x: 48, y: 38, size: 16, rot: -2,  delay: 5.5 },
]

const CSS = `
@keyframes chalkFade {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.chalk-text {
  font-family: 'Segoe UI', Georgia, serif;
  color: rgba(255,255,255,0.85);
  position: absolute;
  animation: chalkFade 8s ease-in-out infinite;
  pointer-events: none;
  user-select: none;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  letter-spacing: 1px;
}
.login-input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}
.login-input:focus {
  border-color: #3d6b35;
  box-shadow: 0 0 0 3px rgba(61,107,53,0.15);
}
.login-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: background 0.15s, transform 0.1s;
  font-family: inherit;
}
.login-btn:hover:not(:disabled) { transform: translateY(-1px); }
.login-btn:active:not(:disabled) { transform: translateY(0); }
`

// Chalk line texture via SVG filter
const ChalkFilter = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <filter id="chalk">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="multiply"/>
      </filter>
    </defs>
  </svg>
)

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
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
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <ChalkFilter />

      {/* Chalkboard background */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1e3d16 0%, #2a5420 50%, #1f4019 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '20px'
      }}>

        {/* Chalk texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, transparent 1px, transparent 48px)',
          pointerEvents: 'none'
        }} />

        {/* Chalk border lines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: '2px solid rgba(255,255,255,0.08)', borderRadius: 4 }} />
        </div>

        {/* Animated chalk writing */}
        {CHALK_ITEMS.map((item, i) => (
          <div
            key={i}
            className="chalk-text"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              fontSize: item.size,
              transform: `rotate(${item.rot}deg)`,
              animationDelay: `${item.delay}s`,
              animationDuration: `${7 + (i % 4)}s`,
            }}
          >
            {item.text}
          </div>
        ))}

        {/* Chalk dust smudges */}
        {[...Array(8)].map((_, i) => (
          <div key={`smudge-${i}`} style={{
            position: 'absolute',
            left: `${(i * 13 + 5) % 90}%`,
            top: `${(i * 17 + 10) % 85}%`,
            width: `${60 + i * 15}px`,
            height: `${8 + i * 3}px`,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '50%',
            filter: 'blur(6px)',
            transform: `rotate(${i * 7 - 20}deg)`,
            pointerEvents: 'none'
          }} />
        ))}

        {/* Login card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '44px 40px',
          width: '100%', maxWidth: 420,
          position: 'relative', zIndex: 1,
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
          animation: 'cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}>
          {/* Brand */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 38, height: 38, background: '#2a5420',
                borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, flexShrink: 0
              }}>🎓</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1a3a12', letterSpacing: '-0.5px', lineHeight: 1.1 }}>Skolo</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>One platform. Whole school.</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', marginBottom: 22 }}>
            Sign in to your school
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626',
              padding: '11px 14px', borderRadius: 10,
              fontSize: 13, marginBottom: 18,
              border: '1px solid #fecaca', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email address
            </label>
            <input className="login-input" name="email" type="email" value={form.email} onChange={handle} required autoComplete="email" />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input className="login-input" name="password" type="password" value={form.password} onChange={handle} required autoComplete="current-password" />

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
              style={{ background: loading ? '#86a87e' : '#2a5420', color: '#fff' }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#94a3b8' }}>
            New school?{' '}
            <Link to="/register" style={{ color: '#2a5420', fontWeight: 700, textDecoration: 'none' }}>
              Register here
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
