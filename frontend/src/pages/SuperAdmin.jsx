import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ════════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════════
const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
.sa-card { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 1px 3px rgba(0,0,0,.06); animation:fadeUp .3s ease both; }
.sa-stat { cursor:default; transition:box-shadow .15s, transform .15s; border:2px solid transparent; }
.sa-stat:hover { box-shadow:0 6px 20px rgba(0,0,0,.1); transform:translateY(-2px); border-color:#e2e8f0; }
.sa-tab { padding:10px 20px; border:none; background:transparent; font-size:14px; font-weight:600; color:#94a3b8; cursor:pointer; border-bottom:2.5px solid transparent; transition:all .15s; white-space:nowrap; }
.sa-tab:hover { color:#475569; }
.sa-tab.active { color:#2563eb; border-bottom-color:#2563eb; }
.sa-table { width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }
.sa-table th { text-align:left; padding:10px 14px; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#94a3b8; border-bottom:2px solid #f1f5f9; position:sticky; top:0; background:#fff; z-index:1; }
.sa-table td { padding:10px 14px; border-bottom:1px solid #f8fafc; color:#334155; }
.sa-table tr:hover td { background:#f8fafc; }
.sa-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:.3px; }
.sa-search { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; outline:none; background:#f8fafc; box-sizing:border-box; }
.sa-search:focus { border-color:#2563eb; background:#fff; }
.sa-drawer-overlay { position:fixed; inset:0; z-index:200; display:flex; justify-content:flex-end; }
.sa-drawer-bg { position:absolute; inset:0; background:rgba(15,23,42,0.5); backdrop-filter:blur(2px); }
.sa-drawer { position:relative; z-index:1; width:65%; max-width:750px; background:#fff; height:100vh; display:flex; flex-direction:column; box-shadow:-12px 0 40px rgba(0,0,0,.15); animation:slideIn .3s cubic-bezier(0.16,1,0.3,1) both; }
`

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const ROLE_COLORS = { admin: '#2563eb', principal: '#8b5cf6', bursar: '#f59e0b', teacher: '#16a34a' }
const STATUS_COLORS = { trial: '#f59e0b', active: '#16a34a', expired: '#ef4444', cancelled: '#94a3b8' }

// ════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

function StatCard({ label, value, sub, accent, icon, delay }) {
  return (
    <div className="sa-card sa-stat" style={{ animationDelay: delay || '0ms' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:28, fontWeight:900, color: accent || '#0f172a', letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize:28, opacity:0.15 }}>{icon}</div>}
      </div>
    </div>
  )
}

function Badge({ text, color }) {
  return <span className="sa-badge" style={{ background: color + '18', color }}>{text}</span>
}

function TimeAgo({ date }) {
  if (!date) return <span style={{ color:'#cbd5e1' }}>Never</span>
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  let text = ''
  if (mins < 1) text = 'Just now'
  else if (mins < 60) text = `${mins}m ago`
  else if (hrs < 24) text = `${hrs}h ago`
  else if (days < 30) text = `${days}d ago`
  else text = new Date(date).toLocaleDateString('en-ZA', { day:'numeric', month:'short' })
  return <span title={new Date(date).toLocaleString()}>{text}</span>
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
      <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#64748b' }}>{title}</div>
      {sub && <div style={{ fontSize:13, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════

export default function SuperAdmin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [logins, setLogins] = useState([])
  const [activity, setActivity] = useState([])
  const [usageStats, setUsageStats] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [schoolDetail, setSchoolDetail] = useState(null)
  const [schoolSearch, setSchoolSearch] = useState('')
  const [loginSearch, setLoginSearch] = useState('')
  const [error, setError] = useState(null)

  // Check super-admin auth
  useEffect(() => {
    const token = localStorage.getItem('sa_token')
    if (!token) {
      navigate('/super-admin/login')
      return
    }
    loadOverview()
  }, [])

  const saApi = useMemo(() => {
    const token = localStorage.getItem('sa_token')
    return {
      get: (url) => api.get(url, { headers: { Authorization: `Bearer ${token}` } }),
    }
  }, [])

  async function loadOverview() {
    try {
      setLoading(true)
      const { data } = await saApi.get('/super-admin/overview')
      setOverview(data)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('sa_token')
        navigate('/super-admin/login')
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLogins() {
    try {
      const { data } = await saApi.get('/super-admin/logins?limit=200&days=30')
      setLogins(data.logins || [])
    } catch {}
  }

  async function loadActivity() {
    try {
      const { data } = await saApi.get('/super-admin/activity?limit=200&days=14')
      setActivity(data.activities || [])
    } catch {}
  }

  async function loadUsageStats() {
    try {
      const { data } = await saApi.get('/super-admin/usage-stats')
      setUsageStats(data)
    } catch {}
  }

  async function loadSchoolDetail(id) {
    try {
      setSchoolDetail(null)
      setSelectedSchool(id)
      const { data } = await saApi.get(`/super-admin/school/${id}`)
      setSchoolDetail(data)
    } catch {}
  }

  useEffect(() => {
    if (tab === 'logins' && logins.length === 0) loadLogins()
    if (tab === 'activity' && activity.length === 0) loadActivity()
    if (tab === 'usage' && !usageStats) loadUsageStats()
  }, [tab])

  // ── Loading / Error states ──
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, fontWeight:900, color:'#0f172a', letterSpacing:'-0.5px' }}>4D Platform Admin</div>
        <div style={{ fontSize:14, color:'#94a3b8', marginTop:8 }}>Loading dashboard…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ textAlign:'center', color:'#ef4444' }}>
        <div style={{ fontSize:18, fontWeight:700 }}>Error loading dashboard</div>
        <div style={{ fontSize:14, marginTop:4 }}>{error}</div>
        <button onClick={loadOverview} style={{ marginTop:16, padding:'8px 20px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>Retry</button>
      </div>
    </div>
  )

  const o = overview

  // ── Filtered schools ──
  const filteredSchools = (o?.schools || []).filter(s => {
    const q = schoolSearch.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
  })

  // ── Filtered logins ──
  const filteredLogins = logins.filter(l => {
    const q = loginSearch.toLowerCase()
    return l.user_name.toLowerCase().includes(q) || l.school_name.toLowerCase().includes(q) || l.user_email.toLowerCase().includes(q)
  })

  // ── Pie data for roles ──
  const rolePie = Object.entries(o?.usersByRole || {}).map(([name, value]) => ({ name, value }))

  // ── Pie data for subscription status ──
  const statusCounts = {}
  ;(o?.schools || []).forEach(s => { statusCounts[s.subscription_status] = (statusCounts[s.subscription_status] || 0) + 1 })
  const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
        {/* ── Top bar ── */}
        <div style={{ background:'#0f172a', color:'#fff', padding:'16px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #2563eb, #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14 }}>4D</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.3px' }}>Skolo Platform Admin</div>
              <div style={{ fontSize:11, color:'#94a3b8' }}>Manage all schools & users</div>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('sa_token'); navigate('/super-admin/login') }}
            style={{ padding:'7px 16px', background:'rgba(255,255,255,0.08)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
            Sign out
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 32px', display:'flex', gap:4, overflowX:'auto' }}>
          {['overview','schools','logins','activity','usage'].map(t => (
            <button key={t} className={`sa-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? '📊 Overview' : t === 'schools' ? '🏫 Schools' : t === 'logins' ? '🔐 Logins' : t === 'activity' ? '📋 Activity' : '📈 Usage'}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth:1300, margin:'0 auto', padding:'24px 32px 60px' }}>

          {/* ══════ OVERVIEW TAB ══════ */}
          {tab === 'overview' && o && (
            <>
              {/* KPI cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:28 }}>
                <StatCard label="Total Schools" value={o.totalSchools} sub={`${o.activeSchools} active (30d)`} accent="#2563eb" icon="🏫" delay="0ms" />
                <StatCard label="Total Users" value={o.totalUsers} sub={`${o.activeUsers} active accounts`} accent="#8b5cf6" icon="👥" delay="60ms" />
                <StatCard label="Total Learners" value={o.totalLearners} sub={`${o.activeLearners} active`} accent="#16a34a" icon="🎓" delay="120ms" />
                <StatCard label="Logins This Week" value={o.loginsThisWeek} sub={`${o.loginsThisMonth} this month`} accent="#f59e0b" icon="🔐" delay="180ms" />
              </div>

              {/* Charts row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
                {/* Users by Role */}
                <div className="sa-card">
                  <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:16 }}>Users by Role</div>
                  {rolePie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={rolePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name} (${value})`}>
                          {rolePie.map((entry, i) => <Cell key={i} fill={ROLE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyState icon="👥" title="No users yet" />}
                </div>

                {/* Schools by Status */}
                <div className="sa-card">
                  <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:16 }}>Schools by Status</div>
                  {statusPie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name} (${value})`}>
                          {statusPie.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyState icon="🏫" title="No schools yet" />}
                </div>
              </div>

              {/* Recent schools */}
              <div className="sa-card">
                <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Recently Registered Schools</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:16 }}>Newest first</div>
                <div style={{ overflowX:'auto' }}>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>School</th><th>Country</th><th>Status</th><th>Users</th><th>Learners</th><th>Logins (30d)</th><th>Last Login</th><th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(o.schools || []).slice(0, 10).map(s => (
                        <tr key={s.id} style={{ cursor:'pointer' }} onClick={() => { setTab('schools'); loadSchoolDetail(s.id) }}>
                          <td style={{ fontWeight:700, color:'#0f172a' }}>{s.name}</td>
                          <td>{s.country}</td>
                          <td><Badge text={s.subscription_status} color={STATUS_COLORS[s.subscription_status] || '#94a3b8'} /></td>
                          <td>{s.userCount}</td>
                          <td>{s.learnerCount}</td>
                          <td>{s.loginCount30d}</td>
                          <td><TimeAgo date={s.lastLogin} /></td>
                          <td style={{ color:'#94a3b8', fontSize:12 }}>{new Date(s.created_at).toLocaleDateString('en-ZA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ══════ SCHOOLS TAB ══════ */}
          {tab === 'schools' && (
            <>
              <div style={{ marginBottom:16 }}>
                <input className="sa-search" placeholder="Search schools by name or country…" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} />
              </div>
              <div className="sa-card" style={{ padding:0 }}>
                <div style={{ overflowX:'auto', maxHeight:'60vh', overflowY:'auto' }}>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>School</th><th>Country</th><th>Plan</th><th>Status</th><th>Users</th><th>Learners</th><th>Logins (30d)</th><th>Last Login</th><th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchools.map(s => (
                        <tr key={s.id} style={{ cursor:'pointer' }} onClick={() => loadSchoolDetail(s.id)}>
                          <td style={{ fontWeight:700, color:'#0f172a' }}>{s.name}</td>
                          <td>{s.country}</td>
                          <td><Badge text={s.subscription_plan || 'free'} color="#2563eb" /></td>
                          <td><Badge text={s.subscription_status} color={STATUS_COLORS[s.subscription_status] || '#94a3b8'} /></td>
                          <td>{s.userCount}</td>
                          <td>{s.learnerCount}</td>
                          <td>{s.loginCount30d}</td>
                          <td><TimeAgo date={s.lastLogin} /></td>
                          <td style={{ color:'#94a3b8', fontSize:12 }}>{new Date(s.created_at).toLocaleDateString('en-ZA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredSchools.length === 0 && <EmptyState icon="🔍" title="No schools match" sub="Try a different search" />}
              </div>

              {/* School detail drawer */}
              {selectedSchool && schoolDetail && (
                <div className="sa-drawer-overlay">
                  <div className="sa-drawer-bg" onClick={() => setSelectedSchool(null)} />
                  <div className="sa-drawer">
                    <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>{schoolDetail.school.name}</div>
                          <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{schoolDetail.school.country} · {schoolDetail.school.email || 'No email'}</div>
                        </div>
                        <button onClick={() => setSelectedSchool(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>✕</button>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:12 }}>
                        <Badge text={schoolDetail.school.subscription_status} color={STATUS_COLORS[schoolDetail.school.subscription_status] || '#94a3b8'} />
                        <Badge text={schoolDetail.school.subscription_plan || 'free'} color="#2563eb" />
                      </div>
                    </div>

                    <div style={{ flex:1, overflowY:'auto', padding:'20px 28px 28px' }}>
                      {/* Stats grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:24 }}>
                        {[
                          { label:'Users', value: schoolDetail.stats.users, accent:'#2563eb' },
                          { label:'Learners', value: schoolDetail.stats.activeLearners, accent:'#16a34a' },
                          { label:'Collection Rate', value: schoolDetail.stats.collectionRate + '%', accent: schoolDetail.stats.collectionRate >= 70 ? '#16a34a' : '#f59e0b' },
                          { label:'Fee Due', value: schoolDetail.school.currency + schoolDetail.stats.totalDue.toLocaleString(), accent:'#0f172a' },
                          { label:'Fee Paid', value: schoolDetail.school.currency + schoolDetail.stats.totalPaid.toLocaleString(), accent:'#16a34a' },
                          { label:'Attendance Rate', value: schoolDetail.stats.attendanceRate != null ? schoolDetail.stats.attendanceRate + '%' : '—', accent:'#8b5cf6' },
                          { label:'Attendance Records', value: schoolDetail.stats.attendanceRecords.toLocaleString(), accent:'#64748b' },
                          { label:'Exam Grades', value: schoolDetail.stats.examGrades.toLocaleString(), accent:'#64748b' },
                          { label:'Created', value: new Date(schoolDetail.school.created_at).toLocaleDateString('en-ZA'), accent:'#64748b' },
                        ].map((s, i) => (
                          <div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px' }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.5px' }}>{s.label}</div>
                            <div style={{ fontSize:20, fontWeight:800, color:s.accent, marginTop:4 }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Staff list */}
                      <div style={{ marginBottom:24 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Staff Accounts</div>
                        <table className="sa-table">
                          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                          <tbody>
                            {schoolDetail.users.map(u => (
                              <tr key={u.id}>
                                <td style={{ fontWeight:600 }}>{u.full_name}</td>
                                <td style={{ color:'#64748b', fontSize:12 }}>{u.email}</td>
                                <td><Badge text={u.role} color={ROLE_COLORS[u.role] || '#64748b'} /></td>
                                <td>{u.is_active ? <Badge text="Active" color="#16a34a" /> : <Badge text="Disabled" color="#ef4444" />}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Recent logins */}
                      <div style={{ marginBottom:24 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Recent Logins</div>
                        {schoolDetail.recentLogins.length > 0 ? (
                          <div style={{ maxHeight:200, overflowY:'auto' }}>
                            {schoolDetail.recentLogins.map(l => (
                              <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                                <div><span style={{ fontWeight:600 }}>{l.user_name}</span> <Badge text={l.user_role} color={ROLE_COLORS[l.user_role] || '#64748b'} /></div>
                                <div style={{ color:'#94a3b8', fontSize:12 }}><TimeAgo date={l.logged_in_at} /></div>
                              </div>
                            ))}
                          </div>
                        ) : <div style={{ color:'#94a3b8', fontSize:13, padding:12 }}>No login records yet</div>}
                      </div>

                      {/* Recent activity */}
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Recent Activity</div>
                        {schoolDetail.recentActivity.length > 0 ? (
                          <div style={{ maxHeight:200, overflowY:'auto' }}>
                            {schoolDetail.recentActivity.map(a => (
                              <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                                <div><span style={{ fontWeight:600 }}>{a.user_name || 'System'}</span> · <span style={{ color:'#64748b' }}>{a.action.replace(/_/g, ' ')}</span></div>
                                <div style={{ color:'#94a3b8', fontSize:12 }}><TimeAgo date={a.created_at} /></div>
                              </div>
                            ))}
                          </div>
                        ) : <div style={{ color:'#94a3b8', fontSize:13, padding:12 }}>No activity records yet</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════ LOGINS TAB ══════ */}
          {tab === 'logins' && (
            <>
              <div style={{ marginBottom:16 }}>
                <input className="sa-search" placeholder="Search by name, email, or school…" value={loginSearch} onChange={e => setLoginSearch(e.target.value)} />
              </div>
              <div className="sa-card" style={{ padding:0 }}>
                <div style={{ overflowX:'auto', maxHeight:'65vh', overflowY:'auto' }}>
                  <table className="sa-table">
                    <thead>
                      <tr><th>User</th><th>Email</th><th>Role</th><th>School</th><th>IP Address</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {filteredLogins.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight:600 }}>{l.user_name}</td>
                          <td style={{ color:'#64748b', fontSize:12 }}>{l.user_email}</td>
                          <td><Badge text={l.user_role} color={ROLE_COLORS[l.user_role] || '#64748b'} /></td>
                          <td>{l.school_name}</td>
                          <td style={{ fontFamily:'monospace', fontSize:12, color:'#94a3b8' }}>{l.ip_address || '—'}</td>
                          <td style={{ color:'#64748b', fontSize:12 }}>{new Date(l.logged_in_at).toLocaleString('en-ZA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredLogins.length === 0 && <EmptyState icon="🔐" title="No login records" sub="Logins will appear here once users start logging in" />}
              </div>
            </>
          )}

          {/* ══════ ACTIVITY TAB ══════ */}
          {tab === 'activity' && (
            <div className="sa-card" style={{ padding:0 }}>
              <div style={{ overflowX:'auto', maxHeight:'70vh', overflowY:'auto' }}>
                <table className="sa-table">
                  <thead>
                    <tr><th>User</th><th>Action</th><th>Type</th><th>School</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {activity.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight:600 }}>{a.user_name}</td>
                        <td>{a.action.replace(/_/g, ' ')}</td>
                        <td><Badge text={a.entity_type || '—'} color="#64748b" /></td>
                        <td>{a.school_name}</td>
                        <td style={{ color:'#64748b', fontSize:12 }}>{new Date(a.created_at).toLocaleString('en-ZA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activity.length === 0 && <EmptyState icon="📋" title="No activity recorded" sub="Feature usage will appear here as schools use the platform" />}
            </div>
          )}

          {/* ══════ USAGE TAB ══════ */}
          {tab === 'usage' && usageStats && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:28 }}>
                <StatCard label="Fee Entries" value={usageStats.totals.feeEntries.toLocaleString()} accent="#2563eb" icon="💰" delay="0ms" />
                <StatCard label="Attendance Records" value={usageStats.totals.attendanceRecords.toLocaleString()} accent="#16a34a" icon="📋" delay="60ms" />
                <StatCard label="Exam Grades" value={usageStats.totals.examGrades.toLocaleString()} accent="#8b5cf6" icon="📝" delay="120ms" />
                <StatCard label="Active Learners" value={usageStats.totals.activeLearners.toLocaleString()} accent="#f59e0b" icon="🎓" delay="180ms" />
              </div>

              {/* Usage by school bar chart */}
              <div className="sa-card">
                <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:16 }}>Feature Usage by School</div>
                {(() => {
                  const chartData = (o?.schools || [])
                    .filter(s => usageStats.bySchool[s.id])
                    .map(s => ({
                      name: s.name.length > 20 ? s.name.slice(0,18) + '…' : s.name,
                      Fees: usageStats.bySchool[s.id]?.fees || 0,
                      Attendance: usageStats.bySchool[s.id]?.attendance || 0,
                      Exams: usageStats.bySchool[s.id]?.exams || 0,
                    }))
                    .sort((a, b) => (b.Fees + b.Attendance + b.Exams) - (a.Fees + a.Attendance + a.Exams))
                    .slice(0, 15)

                  return chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
                      <BarChart data={chartData} layout="vertical" margin={{ left:20, right:20, top:5, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize:11, fill:'#94a3b8' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#334155' }} width={150} />
                        <Tooltip />
                        <Bar dataKey="Fees" fill="#2563eb" radius={[0,4,4,0]} />
                        <Bar dataKey="Attendance" fill="#16a34a" radius={[0,4,4,0]} />
                        <Bar dataKey="Exams" fill="#8b5cf6" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState icon="📈" title="No usage data yet" />
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
