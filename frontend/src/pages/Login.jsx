import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FORMULAS = [
  { text: 'E = mc²',           x: 5,  y: 10, size: 22, rot: -2, delay: 0   },
  { text: 'F = ma',            x: 74, y: 7,  size: 20, rot: 2,  delay: 1.5 },
  { text: '∫f(x)dx',          x: 14, y: 72, size: 20, rot: -3, delay: 3   },
  { text: 'PV = nRT',         x: 82, y: 62, size: 18, rot: 3,  delay: 0.8 },
  { text: 'x² + y² = r²',    x: 56, y: 78, size: 17, rot: -1, delay: 4.5 },
  { text: 'Σ(n²) = n(n+1)(2n+1)/6', x: 58, y: 18, size: 13, rot: 2, delay: 2 },
  { text: 'v = λf',           x: 6,  y: 42, size: 24, rot: -3, delay: 5   },
  { text: 'π ≈ 3.14159',     x: 76, y: 32, size: 18, rot: 2,  delay: 1   },
  { text: 'ΔE = hf',          x: 36, y: 86, size: 22, rot: -2, delay: 6   },
  { text: 'a² + b² = c²',    x: 40, y: 5,  size: 20, rot: 1,  delay: 3.5 },
  { text: '∇ × B = μ₀J',     x: 22, y: 57, size: 16, rot: -2, delay: 7   },
  { text: 'lim(x→0) sin(x)/x = 1', x: 87, y: 16, size: 12, rot: -4, delay: 2.5 },
  { text: 'F = Gm₁m₂/r²',   x: 2,  y: 83, size: 15, rot: 2,  delay: 4   },
  { text: 'e^(iπ) + 1 = 0',  x: 62, y: 52, size: 20, rot: 3,  delay: 8   },
  { text: '√2 ≈ 1.41421',    x: 46, y: 36, size: 16, rot: -1, delay: 5.5 },
  { text: 'S = k ln(W)',      x: 28, y: 22, size: 18, rot: 2,  delay: 9   },
]

const CSS = `
@keyframes chalkFade {
  0%,100% { opacity:0; }
  15%,80%  { opacity:1; }
}
@keyframes cardIn {
  from { opacity:0; transform:translateY(18px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
.chalk { position:absolute; color:rgba(255,255,255,0.82); font-family:'Courier New',monospace; pointer-events:none; user-select:none; letter-spacing:1px; text-shadow:0 0 8px rgba(255,255,255,0.15); animation:chalkFade 9s ease-in-out infinite; }
.li { width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; outline:none; margin-bottom:16px; box-sizing:border-box; font-family:inherit; transition:border-color .15s,box-shadow .15s; }
.li:focus { border-color:#1d4ed8; box-shadow:0 0 0 3px rgba(29,78,216,.12); }
`

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(form.email, form.password); navigate('/') }
    catch (err) { setError(err.response?.data?.error || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f2044 0%, #1a3a6b 45%, #1e3a8a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '20px'
      }}>
        {/* Ruled lines */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0,transparent 1px,transparent 52px)',
        }}/>
        {/* Border */}
        <div style={{ position:'absolute', inset:14, border:'1.5px solid rgba(255,255,255,0.07)', borderRadius:4, pointerEvents:'none' }}/>

        {/* Formulas */}
        {FORMULAS.map((f, i) => (
          <div key={i} className="chalk" style={{
            left:`${f.x}%`, top:`${f.y}%`, fontSize:f.size,
            transform:`rotate(${f.rot}deg)`,
            animationDelay:`${f.delay}s`, animationDuration:`${8+(i%5)}s`
          }}>{f.text}</div>
        ))}

        {/* Card */}
        <div style={{
          background:'#fff', borderRadius:20, padding:'44px 40px',
          width:'100%', maxWidth:420, position:'relative', zIndex:1,
          boxShadow:'0 32px 80px rgba(0,0,0,0.35)',
          animation:'cardIn 0.55s cubic-bezier(0.16,1,0.3,1) both'
        }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:28, fontWeight:800, color:'#1d4ed8', letterSpacing:'-0.5px', lineHeight:1 }}>Skolo</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:500 }}>One platform. Whole school.</div>
          </div>

          <div style={{ fontSize:19, fontWeight:700, color:'#0f172a', marginBottom:22 }}>Sign in to your school</div>

          {error && (
            <div style={{ background:'#fef2f2', color:'#dc2626', padding:'11px 14px', borderRadius:10, fontSize:13, marginBottom:18, border:'1px solid #fecaca', fontWeight:500 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Email address</label>
            <input className="li" name="email" type="email" value={form.email} onChange={handle} required autoComplete="email" />
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Password</label>
            <input className="li" name="password" type="password" value={form.password} onChange={handle} required autoComplete="current-password" />
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px', border:'none', borderRadius:10,
              fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer',
              background:loading?'#93c5fd':'#1d4ed8', color:'#fff',
              transition:'background .15s', fontFamily:'inherit'
            }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:22, fontSize:13, color:'#94a3b8' }}>
            New school?{' '}
            <Link to="/register" style={{ color:'#1d4ed8', fontWeight:700, textDecoration:'none' }}>Register here</Link>
          </div>
        </div>
      </div>
    </>
  )
}
