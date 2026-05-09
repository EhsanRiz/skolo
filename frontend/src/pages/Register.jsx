import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import api, { errMessage } from '../lib/api'

const CSS = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token')

  const [countries, setCountries] = useState([])
  const [regions,   setRegions]   = useState([])
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [validating, setValidating] = useState(true)
  const [inviteValid, setInviteValid] = useState(false)

  const [school, setSchool] = useState({ name: '', country_id: '', region_id: '', address: '', phone: '', email: '', school_reg_number: '' })
  const [admin,  setAdmin]  = useState({ full_name: '', email: '', password: '' })

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) {
      setValidating(false)
      return
    }
    api.get(`/auth/validate-invite/${inviteToken}`)
      .then(r => {
        setInviteValid(true)
        setAdmin(a => ({ ...a, email: r.data.email }))
      })
      .catch(err => {
        setError(errMessage(err, 'Invalid or expired invite link'))
      })
      .finally(() => setValidating(false))
  }, [inviteToken])

  useEffect(() => { api.get('/schools/countries').then(r => setCountries(r.data)) }, [])
  useEffect(() => {
    if (school.country_id) {
      api.get(`/schools/regions/${school.country_id}`).then(r => setRegions(r.data))
      setSchool(s => ({ ...s, region_id: '' }))
    }
  }, [school.country_id])

  const hs = e => setSchool(s => ({ ...s, [e.target.name]: e.target.value }))
  const ha = e => setAdmin(a => ({ ...a, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/register-school', { school, admin, invite_token: inviteToken })
      localStorage.setItem('sk_token', data.token)
      localStorage.setItem('sk_user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) { setError(errMessage(err, 'Registration failed')) }
    finally { setLoading(false) }
  }

  // No invite token — redirect to login
  if (!validating && !inviteToken) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #f7f7f7 0%, #e6eff5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 36px',
            width: '100%', maxWidth: 420, textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.5s ease both'
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#003049', letterSpacing: '-0.5px', marginBottom: 12 }}>Skolo</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Registration is by invite only</div>
            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
              To register your school on Skolo, you need an invite from the platform admin. If you already have an account, you can sign in below.
            </div>
            <Link to="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#003049', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Go to Sign In
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Invalid token
  if (!validating && inviteToken && !inviteValid) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #f7f7f7 0%, #e6eff5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 36px',
            width: '100%', maxWidth: 420, textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.5s ease both'
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#003049', letterSpacing: '-0.5px', marginBottom: 12 }}>Skolo</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Invalid Invite Link</div>
            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
              {error || 'This invite link is not valid. It may have expired or already been used. Please contact the platform admin for a new invite.'}
            </div>
            <Link to="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#003049', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Go to Sign In
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Still validating
  if (validating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #f7f7f7 0%, #e6eff5 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Skolo</div>
          <div style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>Verifying your invite...</div>
        </div>
      </div>
    )
  }

  const inp = { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', marginBottom: 14, background: '#fff', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }
  const sec = { fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, marginTop: 20 }

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f7f7f7 0%, #e6eff5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px'
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '40px 36px',
          width: '100%', maxWidth: 520,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.5s ease both'
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#003049', letterSpacing: '-0.5px' }}>Skolo</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>One platform. Whole school.</div>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1f2937', marginBottom: 22 }}>Register your school</div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '11px 14px', borderRadius: 10, fontSize: 13, marginBottom: 20, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={sec}>School details</div>

            <label style={lbl}>School name *</label>
            <input style={inp} name="name" value={school.name} onChange={hs} required />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div>
                <label style={lbl}>Country *</label>
                <select style={inp} name="country_id" value={school.country_id} onChange={hs} required>
                  <option value="">Select…</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>District / Province *</label>
                <select style={inp} name="region_id" value={school.region_id} onChange={hs} required disabled={!regions.length}>
                  <option value="">Select…</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div><label style={lbl}>School phone</label><input style={inp} name="phone" value={school.phone} onChange={hs} /></div>
              <div><label style={lbl}>School email</label><input style={inp} name="email" type="email" value={school.email} onChange={hs} /></div>
            </div>

            <label style={lbl}>Registration number (EMIS / MoE ref)</label>
            <input style={inp} name="school_reg_number" value={school.school_reg_number} onChange={hs} />

            <div style={sec}>Admin account</div>
            <label style={lbl}>Your full name *</label>
            <input style={inp} name="full_name" value={admin.full_name} onChange={ha} required />
            <label style={lbl}>Your email *</label>
            <input style={{ ...inp, ...(inviteToken ? { background: '#f7f7f7', color: '#6b7280' } : {}) }} name="email" type="email" value={admin.email} onChange={ha} required readOnly={!!inviteToken} />
            <label style={lbl}>Password *</label>
            <input style={inp} name="password" type="password" value={admin.password} onChange={ha} required minLength={8} />

            <button disabled={loading} style={{
              width: '100%', padding: '13px', background: loading ? '#4b6a9e' : '#003049',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8
            }}>
              {loading ? 'Registering…' : 'Register school →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#003049', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </div>
          {/* Attribution */}
          <div style={{ marginTop:24, paddingTop:18, borderTop:'1px solid #f3f4f6', textAlign:'center', fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
            Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer" style={{ color:'#003049', fontWeight:600, textDecoration:'none' }}>4D Climate Solutions</a>
            <div style={{ marginTop:6, fontSize:10, color:'#9ca3af' }}>© {new Date().getFullYear()} · All rights reserved</div>
          </div>
        </div>
      </div>
    </>
  )
}
