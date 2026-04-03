import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

const CSS = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Register() {
  const navigate = useNavigate()
  const [countries, setCountries] = useState([])
  const [regions,   setRegions]   = useState([])
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const [school, setSchool] = useState({ name: '', country_id: '', region_id: '', address: '', phone: '', email: '', school_reg_number: '' })
  const [admin,  setAdmin]  = useState({ full_name: '', email: '', password: '' })

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
      const { data } = await api.post('/auth/register-school', { school, admin })
      localStorage.setItem('sk_token', data.token)
      localStorage.setItem('sk_user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) { setError(err.response?.data?.error || 'Registration failed') }
    finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '10px 13px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', marginBottom: 14, background: '#fff', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }
  const sec = { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, marginTop: 20 }

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a3a6b 0%, #1d4ed8 50%, #1e40af 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px'
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '40px 36px',
          width: '100%', maxWidth: 520,
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.5s ease both'
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8', letterSpacing: '-0.5px' }}>Skolo</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>One platform. Whole school.</div>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', marginBottom: 22 }}>Register your school</div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '11px 14px', borderRadius: 10, fontSize: 13, marginBottom: 20, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={sec}>School details</div>

            <label style={lbl}>School name *</label>
            <input style={inp} name="name" value={school.name} onChange={hs} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>School phone</label><input style={inp} name="phone" value={school.phone} onChange={hs} /></div>
              <div><label style={lbl}>School email</label><input style={inp} name="email" type="email" value={school.email} onChange={hs} /></div>
            </div>

            <label style={lbl}>Registration number (EMIS / MoE ref)</label>
            <input style={inp} name="school_reg_number" value={school.school_reg_number} onChange={hs} />

            <div style={sec}>Admin account</div>
            <label style={lbl}>Your full name *</label>
            <input style={inp} name="full_name" value={admin.full_name} onChange={ha} required />
            <label style={lbl}>Your email *</label>
            <input style={inp} name="email" type="email" value={admin.email} onChange={ha} required />
            <label style={lbl}>Password *</label>
            <input style={inp} name="password" type="password" value={admin.password} onChange={ha} required minLength={8} />

            <button disabled={loading} style={{
              width: '100%', padding: '13px', background: loading ? '#93c5fd' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8
            }}>
              {loading ? 'Registering…' : 'Register school →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </>
  )
}
