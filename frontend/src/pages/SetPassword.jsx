import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function SetPassword() {
  const { token }   = useParams()
  const navigate    = useNavigate()
  const { login }   = useAuth()

  const [step,     setStep]     = useState('loading') // loading | valid | invalid | success
  const [invite,   setInvite]   = useState(null)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!token) { setStep('invalid'); return }
    fetch(`${API}/auth/verify-invite/${token}`)
      .then(async r => {
        const data = await r.json()
        if (data.valid) { setInvite(data); setStep('valid') }
        else { setError(data.error || 'Invalid invite link'); setStep('invalid') }
      })
      .catch(err => {
        console.error('Verify invite error:', err)
        setError('Could not reach the server. Please try again in a moment.')
        setStep('invalid')
      })
  }, [token])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setSaving(true)
    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to set password'); return }

      // Auto-login with returned token
      localStorage.setItem('sk_token', data.token)
      localStorage.setItem('sk_user',  JSON.stringify(data.user))
      setStep('success')
      setTimeout(() => navigate('/'), 2000)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setSaving(false) }
  }

  const strength = pw => {
    if (!pw) return null
    if (pw.length < 8)  return { label:'Too short', color:'#dc2626', width:'20%' }
    if (pw.length < 10) return { label:'Weak',       color:'#f7c548', width:'40%' }
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label:'Fair', color:'#f7c548', width:'60%' }
    return { label:'Strong', color:'#16a34a', width:'100%' }
  }
  const pw = strength(password)

  return (
    <div style={{ minHeight:'100vh', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, background:'#003049', borderRadius:14, marginBottom:12 }}>
            <span style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>S</span>
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#003049', letterSpacing:'-0.5px' }}>Skolo</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>One platform. Whole school.</div>
        </div>

        <div style={{ background:'#fff', borderRadius:18, padding:'32px', boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>

          {/* Loading */}
          {step === 'loading' && (
            <div style={{ textAlign:'center', color:'#6b7280', padding:'20px 0' }}>
              Verifying your invite link…
            </div>
          )}

          {/* Invalid */}
          {step === 'invalid' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
              <div style={{ fontWeight:700, fontSize:16, color:'#dc2626', marginBottom:8 }}>Invite link invalid</div>
              <div style={{ fontSize:14, color:'#6b7280', lineHeight:1.6, marginBottom:24 }}>
                {error || 'This link is invalid or has expired.'}
                <br />Ask your school admin to resend the invite.
              </div>
              <a href="/login" style={{ display:'inline-block', padding:'10px 24px', background:'#003049', color:'#fff', borderRadius:9, textDecoration:'none', fontWeight:700, fontSize:14 }}>
                Go to login →
              </a>
            </div>
          )}

          {/* Valid — set password form */}
          {step === 'valid' && invite && (
            <>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>Welcome to Skolo</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#1f2937', marginBottom:4 }}>{invite.full_name}</div>
                <div style={{ fontSize:14, color:'#6b7280' }}>
                  {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)} at <strong>{invite.school_name}</strong>
                </div>
              </div>

              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:13, color:'#15803d' }}>
                ✓ Invite verified — set your password to activate your account
              </div>

              <form onSubmit={handleSubmit}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:14, outline:'none', marginBottom:8, boxSizing:'border-box' }}
                />
                {pw && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ height:4, background:'#f7f7f7', borderRadius:4, overflow:'hidden', marginBottom:4 }}>
                      <div style={{ height:'100%', width:pw.width, background:pw.color, borderRadius:4, transition:'width .3s' }} />
                    </div>
                    <div style={{ fontSize:11, color:pw.color, fontWeight:600 }}>{pw.label}</div>
                  </div>
                )}

                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Confirm password *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ width:'100%', padding:'11px 14px', border:`1.5px solid ${confirm && confirm !== password ? '#fca5a5' : '#e5e7eb'}`, borderRadius:9, fontSize:14, outline:'none', marginBottom:confirm && confirm !== password ? 6 : 20, boxSizing:'border-box' }}
                />
                {confirm && confirm !== password && (
                  <div style={{ fontSize:12, color:'#dc2626', marginBottom:14 }}>Passwords do not match</div>
                )}

                {error && (
                  <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16 }}>{error}</div>
                )}

                <button type="submit" disabled={saving || !password || !confirm}
                  style={{ width:'100%', padding:'13px', background: saving ? '#4b6a9e' : '#003049', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:15, cursor: saving ? 'not-allowed' : 'pointer', transition:'background .15s' }}>
                  {saving ? 'Setting password…' : 'Set password & sign in →'}
                </button>
              </form>
            </>
          )}

          {/* Success */}
          {step === 'success' && (
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:18, color:'#16a34a', marginBottom:8 }}>Password set!</div>
              <div style={{ fontSize:14, color:'#6b7280' }}>Taking you to your dashboard…</div>
            </div>
          )}

        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
          Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
        </div>
      </div>
    </div>
  )
}
