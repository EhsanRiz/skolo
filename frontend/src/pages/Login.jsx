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
            <div style={{ textAlign:'right', marginTop:-10, marginBottom:16 }}>
              <Link to="/forgot-password" style={{ fontSize:12, color:'#64748b', textDecoration:'none' }}>Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px', border:'none', borderRadius:10,
              fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer',
              background:loading?'#4b6a9e':'#0f2044', color:'#fff',
              transition:'background .15s', fontFamily:'inherit'
            }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:22, fontSize:13, color:'#94a3b8' }}>
            New school?{' '}
            <Link to="/register" style={{ color:'#1d4ed8', fontWeight:700, textDecoration:'none' }}>Register here</Link>
          </div>

          {/* 4DCS branding */}
          <div style={{ marginTop:28, paddingTop:18, borderTop:'1px solid #f1f5f9', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#cbd5e1', marginBottom:8, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.8px' }}>Developed by</div>
            <img src="data:image/jpeg;base64,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" alt="4D Climate Solutions"
              style={{ height:28, objectFit:'contain', opacity:0.85 }}/>
            <div style={{ fontSize:10, color:'#cbd5e1', marginTop:8 }}>
              © {new Date().getFullYear()} 4D Climate Solutions · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
