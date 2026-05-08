import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/super-admin/login', { email, password })
      localStorage.setItem('sa_token', data.token)
      navigate('/super-admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #1f2937 0%, #1f2937 100%)' }}>
      <form onSubmit={handleSubmit} style={{ width:380, background:'#fff', borderRadius:18, padding:'40px 36px', boxShadow:'0 25px 50px rgba(0,0,0,.25)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'linear-gradient(135deg, #003049, #7c3aed)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
            <span style={{ fontWeight:900, fontSize:20, color:'#fff' }}>4D</span>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'#1f2937', letterSpacing:'-0.5px' }}>Platform Admin</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Sign in to manage all Skolo schools</div>
        </div>

        {error && (
          <div style={{ background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600, marginBottom:16, border:'1px solid #fee2e2' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = '#003049'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e5e7eb', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = '#003049'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <button type="submit" disabled={loading}
          style={{ width:'100%', padding:'13px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #003049, #7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor: loading ? 'wait' : 'pointer', transition:'all .2s' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
