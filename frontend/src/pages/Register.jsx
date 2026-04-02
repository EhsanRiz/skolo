import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

const s = {
  page: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px'
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  logo: { fontSize: 26, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 28 },
  section: { fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12, marginTop: 24, textTransform: 'uppercase' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 12
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, background: '#fff', marginBottom: 12
  },
  btn: {
    width: '100%', padding: '13px', background: '#1d4ed8', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 8
  },
  error: { background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  login: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' },
  link: { color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }
}

export default function Register() {
  const navigate = useNavigate()
  const [countries, setCountries] = useState([])
  const [regions, setRegions]     = useState([])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const [school, setSchool] = useState({
    name: '', country_id: '', region_id: '', address: '', phone: '', email: '', school_reg_number: ''
  })
  const [admin, setAdmin] = useState({ full_name: '', email: '', password: '' })

  useEffect(() => {
    api.get('/schools/countries').then(r => setCountries(r.data))
  }, [])

  useEffect(() => {
    if (school.country_id) {
      api.get(`/schools/regions/${school.country_id}`).then(r => setRegions(r.data))
      setSchool(s => ({ ...s, region_id: '' }))
    }
  }, [school.country_id])

  const hs = e => setSchool(s => ({ ...s, [e.target.name]: e.target.value }))
  const ha = e => setAdmin(a => ({ ...a, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register-school', { school, admin })
      localStorage.setItem('sk_token', data.token)
      localStorage.setItem('sk_user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Skolo</div>
        <div style={s.sub}>Register your school — it takes 2 minutes</div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={submit}>
          <div style={s.section}>School details</div>
          <label style={s.label}>School name *</label>
          <input style={s.input} name="name" value={school.name} onChange={hs} required />

          <div style={s.row}>
            <div>
              <label style={s.label}>Country *</label>
              <select style={s.select} name="country_id" value={school.country_id} onChange={hs} required>
                <option value="">Select…</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>District / Province *</label>
              <select style={s.select} name="region_id" value={school.region_id} onChange={hs} required disabled={!regions.length}>
                <option value="">Select…</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>School phone</label>
              <input style={s.input} name="phone" value={school.phone} onChange={hs} />
            </div>
            <div>
              <label style={s.label}>School email</label>
              <input style={s.input} name="email" type="email" value={school.email} onChange={hs} />
            </div>
          </div>

          <label style={s.label}>Registration number (EMIS / MoE ref)</label>
          <input style={s.input} name="school_reg_number" value={school.school_reg_number} onChange={hs} />

          <div style={s.section}>Admin account</div>
          <label style={s.label}>Your full name *</label>
          <input style={s.input} name="full_name" value={admin.full_name} onChange={ha} required />
          <label style={s.label}>Your email *</label>
          <input style={s.input} name="email" type="email" value={admin.email} onChange={ha} required />
          <label style={s.label}>Password *</label>
          <input style={s.input} name="password" type="password" value={admin.password} onChange={ha} required minLength={8} />

          <button style={s.btn} disabled={loading}>
            {loading ? 'Registering…' : 'Register school →'}
          </button>
        </form>
        <div style={s.login}>
          Already registered? <Link to="/login" style={s.link}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
