import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const EVENT_COLORS = {
  academic: '#2563eb', sports: '#16a34a',
  meeting:  '#ca8a04', holiday: '#db2777', general: '#64748b'
}

const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes drawerIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
.dash-card { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 1px 3px rgba(0,0,0,.06); animation:fadeUp .3s ease both; }
.stat-card { cursor:pointer; transition:box-shadow .15s, transform .15s; border:2px solid transparent; }
.stat-card:hover { box-shadow:0 6px 20px rgba(0,0,0,.1); transform:translateY(-2px); border-color:#e2e8f0; }
.grade-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f8fafc; }
.grade-row:last-child { border-bottom:none; }
.progress-bar { height:7px; border-radius:10px; background:#f1f5f9; overflow:hidden; flex:1; }
.progress-fill { height:100%; border-radius:10px; transition:width .8s ease; }
.quick-link { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; background:#f8fafc; border-radius:9px; text-decoration:none; color:#0f172a; font-size:13px; font-weight:600; margin-bottom:8px; transition:background .12s; border:none; cursor:pointer; width:100%; box-sizing:border-box; }
.quick-link:hover { background:#f1f5f9; }
.pending-card { padding:10px 12px; border-radius:9px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background .1s; }
.pending-card:hover { filter:brightness(0.97); }
`

function StatCard({ label, value, sub, accent, onClick, delay }) {
  return (
    <div className="dash-card stat-card" onClick={onClick}
      style={{ animationDelay:delay||'0ms' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:900, color:accent||'#0f172a', letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>{sub}</div>}
      {onClick && <div style={{ fontSize:11, color:'#cbd5e1', marginTop:10, fontWeight:500 }}>Click to view →</div>}
    </div>
  )
}

function OutstandingDrawer({ entries, sym, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = entries.filter(e => {
    const name = `${e.learners?.first_name||''} ${e.learners?.last_name||''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || (e.learners?.reference_no||'').includes(search)
  })

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(2px)' }} />
      <div style={{ position:'relative', zIndex:1, width:'62%', maxWidth:700, background:'#fff', height:'100vh', display:'flex', flexDirection:'column', boxShadow:'-12px 0 40px rgba(0,0,0,.15)', animation:'drawerIn .3s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'#0f172a' }}>Outstanding fees</div>
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{entries.length} entries unpaid</div>
            </div>
            <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>✕</button>
          </div>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search learner…"
            style={{ width:'100%', padding:'9px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', background:'#f8fafc', boxSizing:'border-box' }} />
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 28px 28px' }}>
          {filtered.map((e, i) => {
            const balance   = Number(e.amount_due) - Number(e.amount_paid)
            const isOverdue = e.status === 'overdue'
            return (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f8fafc', background: isOverdue ? '#fff9f9' : '' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0f172a' }}>
                    {e.learners?.first_name} {e.learners?.last_name}
                    {e.learners?.reference_no && <span style={{ marginLeft:8, fontSize:11, color:'#94a3b8', fontWeight:600 }}>#{e.learners.reference_no}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                    {e.learners?.classes?.grades?.name} {e.learners?.classes?.name} · {e.description}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                  <div style={{ fontWeight:800, fontSize:15, color: isOverdue ? '#dc2626' : '#374151' }}>{sym}{balance.toLocaleString()}</div>
                  <span style={{ fontSize:11, fontWeight:700, background: isOverdue?'#fee2e2':'#f1f5f9', color: isOverdue?'#dc2626':'#64748b', padding:'1px 8px', borderRadius:20 }}>
                    {e.status}
                  </span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ textAlign:'center', color:'#94a3b8', fontSize:14, padding:40 }}>No results.</div>}
        </div>
        <div style={{ padding:'16px 28px', borderTop:'1px solid #f1f5f9', flexShrink:0 }}>
          <Link to="/fees" onClick={onClose}
            style={{ display:'block', textAlign:'center', padding:'11px', background:'#0f2044', color:'#fff', borderRadius:9, textDecoration:'none', fontSize:13, fontWeight:700 }}>
            Open Fee Collection →
          </Link>
        </div>
      </div>
    </div>
  )
}

function WaiverQueueLink({ isPrincipal }) {
  const [pending, setPending] = useState(0)
  useEffect(() => {
    api.get('/waivers').then(r => {
      setPending((r.data||[]).filter(w => w.status === 'pending').length)
    }).catch(()=>{})
  }, [])

  if (pending === 0 && !isPrincipal) return null
  return (
    <Link to="/waivers" className="quick-link"
      style={isPrincipal && pending > 0 ? { background:'#faf5ff', border:'1px solid #c4b5fd' } : {}}>
      <span style={{ color: isPrincipal && pending > 0 ? '#7c3aed' : '#0f172a' }}>
        {isPrincipal ? '✅ Waiver approvals' : '📋 Waiver requests'}
        {pending > 0 && (
          <span style={{ marginLeft:8, background:'#7c3aed', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:11, fontWeight:700 }}>
            {pending} pending
          </span>
        )}
      </span>
      <span style={{ color:'#94a3b8' }}>→</span>
    </Link>
  )
}

export default function Dashboard() {
  const { school, user } = useAuth()
  const isPrincipal = user?.role === 'principal'
  const navigate  = useNavigate()
  const sym       = school?.countries?.currency_symbol || 'R'
  const now       = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  const [ledger,   setLedger]   = useState([])
  const [learners, setLearners] = useState([])
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [drawer,   setDrawer]   = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/fee-ledger?month=${thisMonth}`),
      api.get('/learners'),
      api.get(`/events?from=${now.toISOString().slice(0,10)}`),
    ]).then(([l, lr, ev]) => {
      setLedger(l.data || [])
      setLearners(lr.data || [])
      setEvents((ev.data || []).slice(0, 5))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── Stats ─────────────────────────────────────────────────
  const monthDue       = ledger.reduce((s,e) => s + Number(e.amount_due), 0)
  const monthPaid      = ledger.reduce((s,e) => s + Number(e.amount_paid), 0)
  const monthBalance   = monthDue - monthPaid
  const collectionRate = monthDue > 0 ? Math.round(monthPaid/monthDue*100) : 0
  const unpaidEntries  = ledger.filter(e => e.status !== 'paid')
  const overdueCount   = ledger.filter(e => e.status === 'overdue').length

  // ── Grade breakdown ───────────────────────────────────────
  const grades = useMemo(() => {
    const g = {}
    ledger.forEach(e => {
      const name = e.learners?.classes?.grades?.name || 'Unassigned'
      if (!g[name]) g[name] = { name, due:0, paid:0, unpaid:0, overdue:0 }
      g[name].due    += Number(e.amount_due)
      g[name].paid   += Number(e.amount_paid)
      g[name].unpaid += e.status !== 'paid' ? 1 : 0
      g[name].overdue += e.status === 'overdue' ? 1 : 0
    })
    return Object.values(g)
      .map(g => ({ ...g, pct: g.due > 0 ? Math.round(g.paid/g.due*100) : 0 }))
      .sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric:true }))
  }, [ledger])

  const rc = r => r >= 80 ? '#16a34a' : r >= 50 ? '#ca8a04' : '#dc2626'
  const rb = r => r >= 80 ? '#16a34a' : r >= 50 ? '#f59e0b' : '#ef4444'

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <>
      <style>{CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>
          {now.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          {isPrincipal && <span style={{ marginLeft:10, fontSize:12, background:'#f0fdf4', color:'#15803d', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>Principal view</span>}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard delay="0ms"   label="Total learners"       value={learners.length}                             sub={`${school?.name || ''}`}              onClick={() => navigate('/learners')} />
        <StatCard delay="60ms"  label={`${monthLabel} — due`} value={`${sym}${monthDue.toLocaleString()}`}      sub={`${ledger.length} entries`}           onClick={() => navigate('/fees')} />
        <StatCard delay="120ms" label="Collected"             value={`${sym}${monthPaid.toLocaleString()}`}      sub={`${sym}${monthBalance.toLocaleString()} outstanding`} accent="#16a34a" onClick={() => navigate('/fees')} />
        <StatCard delay="180ms" label="Collection rate"       value={`${collectionRate}%`}
          sub={overdueCount > 0 ? `⚠ ${overdueCount} overdue` : unpaidEntries.length > 0 ? `${unpaidEntries.length} pending` : 'All collected ✓'}
          accent={rc(collectionRate)} onClick={() => setDrawer(true)} />
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Grade breakdown */}
        <div className="dash-card" style={{ animationDelay:'240ms' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>Collection by grade</div>
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{monthLabel}</div>
            </div>
            <Link to="/fees" style={{ fontSize:12, color:'#0f2044', fontWeight:700, textDecoration:'none' }}>View all →</Link>
          </div>
          {loading && <div style={{ color:'#94a3b8', fontSize:13, padding:'20px 0' }}>Loading…</div>}
          {!loading && grades.length === 0 && (
            <div style={{ color:'#94a3b8', fontSize:13, padding:'20px 0', textAlign:'center' }}>
              No fee entries for {monthLabel}.<br/>
              <Link to="/settings" style={{ color:'#0f2044', fontWeight:600 }}>Check fee plans →</Link>
            </div>
          )}
          {grades.map(g => (
            <div key={g.name} className="grade-row">
              <div style={{ width:68, fontSize:13, fontWeight:600, color:'#0f172a', flexShrink:0 }}>{g.name}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${g.pct}%`, background:rb(g.pct) }} />
              </div>
              <div style={{ width:34, textAlign:'right', fontSize:12, fontWeight:800, color:rc(g.pct), flexShrink:0 }}>{g.pct}%</div>
              <div style={{ width:100, textAlign:'right', fontSize:11, color:'#94a3b8', flexShrink:0 }}>{sym}{g.paid.toLocaleString()}/{sym}{g.due.toLocaleString()}</div>
              {g.overdue > 0
                ? <span style={{ fontSize:11, fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'1px 7px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>⚠ {g.overdue}</span>
                : g.unpaid > 0
                  ? <span style={{ fontSize:11, fontWeight:600, color:'#64748b', background:'#f1f5f9', padding:'1px 7px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>{g.unpaid}</span>
                  : <span style={{ fontSize:14, flexShrink:0 }}>✅</span>
              }
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Quick actions — role aware */}
          <div className="dash-card" style={{ animationDelay:'300ms' }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:14 }}>
              {isPrincipal ? 'Principal actions' : 'Quick actions'}
            </div>

            {unpaidEntries.length > 0 && (
              <button className="quick-link" onClick={() => setDrawer(true)}
                style={{ background:'#fff7ed', border:'1px solid #fed7aa' }}>
                <span style={{ color:'#c2410c' }}>
                  💰 {unpaidEntries.length} unpaid — {sym}{monthBalance.toLocaleString()} outstanding
                </span>
                <span style={{ color:'#94a3b8' }}>→</span>
              </button>
            )}

            {/* Waiver queue — prominent for principal */}
            <WaiverQueueLink isPrincipal={isPrincipal} />

            <Link to="/fees" className="quick-link">
              <span>📋 Fee overview — {monthLabel}</span>
              <span style={{ color:'#94a3b8' }}>→</span>
            </Link>

            <Link to="/learners" className="quick-link">
              <span>🎒 Learners ({learners.length})</span>
              <span style={{ color:'#94a3b8' }}>→</span>
            </Link>

            <Link to="/announcements" className="quick-link">
              <span>📢 {isPrincipal ? 'Post announcement' : 'Send announcement'}</span>
              <span style={{ color:'#94a3b8' }}>→</span>
            </Link>

            {!isPrincipal && (
              <Link to="/settings" className="quick-link">
                <span>⚙ Settings</span>
                <span style={{ color:'#94a3b8' }}>→</span>
              </Link>
            )}
          </div>

          {/* Events */}
          <div className="dash-card" style={{ flex:1, animationDelay:'360ms' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>Upcoming events</div>
              <Link to="/events" style={{ fontSize:12, color:'#0f2044', fontWeight:700, textDecoration:'none' }}>View all →</Link>
            </div>
            {events.length === 0 && (
              <div style={{ color:'#94a3b8', fontSize:13 }}>
                No events. <Link to="/events" style={{ color:'#0f2044', fontWeight:600, textDecoration:'none' }}>Add one →</Link>
              </div>
            )}
            {events.map(ev => (
              <div key={ev.id} style={{ display:'flex', gap:10, marginBottom:12, paddingBottom:12, borderBottom:'1px solid #f8fafc' }}>
                <div style={{ width:3, borderRadius:4, flexShrink:0, background:EVENT_COLORS[ev.event_type]||'#94a3b8' }} />
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{ev.title}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short' })}
                    {ev.event_type && ` · ${ev.event_type}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending / overdue cards */}
      {unpaidEntries.length > 0 && (
        <div className="dash-card" style={{ animationDelay:'420ms' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>Needs collection — {monthLabel}</div>
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>
                {overdueCount > 0 && <span style={{ color:'#dc2626', fontWeight:600, marginRight:10 }}>⚠ {overdueCount} overdue</span>}
                {unpaidEntries.length - overdueCount > 0 && `${unpaidEntries.length - overdueCount} pending`}
              </div>
            </div>
            <button onClick={() => setDrawer(true)}
              style={{ padding:'7px 14px', background:'#0f2044', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              View all
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>
            {unpaidEntries.slice(0, 8).map(e => {
              const balance   = Number(e.amount_due) - Number(e.amount_paid)
              const isOverdue = e.status === 'overdue'
              return (
                <div key={e.id} className="pending-card"
                  onClick={() => navigate(`/learners/${e.learners?.id}`)}
                  style={{ background: isOverdue ? '#fff9f9' : '#f8fafc', border:`1px solid ${isOverdue?'#fca5a5':'#e2e8f0'}` }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{e.learners?.first_name} {e.learners?.last_name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{e.learners?.classes?.grades?.name} {e.learners?.classes?.name}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                    <div style={{ fontWeight:800, fontSize:13, color: isOverdue?'#dc2626':'#374151' }}>{sym}{balance.toLocaleString()}</div>
                    <div style={{ fontSize:10, fontWeight:700, color: isOverdue?'#dc2626':'#64748b' }}>{e.status}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {unpaidEntries.length > 8 && (
            <button onClick={() => setDrawer(true)}
              style={{ marginTop:12, fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>
              + {unpaidEntries.length - 8} more → view all
            </button>
          )}
        </div>
      )}

      {/* All paid celebration */}
      {!loading && ledger.length > 0 && unpaidEntries.length === 0 && (
        <div className="dash-card" style={{ textAlign:'center', padding:'36px', animationDelay:'420ms' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🎉</div>
          <div style={{ fontWeight:800, fontSize:17, color:'#16a34a', marginBottom:4 }}>All fees collected for {monthLabel}!</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>{sym}{monthPaid.toLocaleString()} collected from {learners.length} learner{learners.length!==1?'s':''}.</div>
        </div>
      )}

      {/* Outstanding drawer */}
      {drawer && <OutstandingDrawer entries={unpaidEntries} sym={sym} onClose={() => setDrawer(false)} />}
    </>
  )
}
