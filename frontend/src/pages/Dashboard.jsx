import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { SkeletonCard, EmptyState } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const EVENT_COLORS = {
  academic: '#003049', sports: '#16a34a',
  meeting:  '#b8870a', holiday: '#db2777', general: '#6b7280'
}

const DAY_NAMES = ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes drawerIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
.dash-card { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 1px 3px rgba(0,0,0,.06); animation:fadeUp .3s ease both; }
.stat-card { cursor:pointer; transition:box-shadow .15s, transform .15s; border:2px solid transparent; }
.stat-card:hover { box-shadow:0 6px 20px rgba(0,0,0,.1); transform:translateY(-2px); border-color:#e5e7eb; }
.grade-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #fafafa; }
.grade-row:last-child { border-bottom:none; }
.progress-bar { height:7px; border-radius:10px; background:#f7f7f7; overflow:hidden; flex:1; }
.progress-fill { height:100%; border-radius:10px; transition:width .8s ease; }
.quick-link { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; background:#fafafa; border-radius:9px; text-decoration:none; color:#1f2937; font-size:13px; font-weight:600; margin-bottom:8px; transition:background .12s; border:none; cursor:pointer; width:100%; box-sizing:border-box; }
.quick-link:hover { background:#f7f7f7; }
.pending-card { padding:10px 12px; border-radius:9px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background .1s; }
.pending-card:hover { filter:brightness(0.97); }
.tt-slot { border-radius:8px; padding:8px 10px; margin-bottom:4px; transition:all .15s; }
.tt-slot:last-child { margin-bottom:0; }
.tt-now { box-shadow:0 0 0 2px #003049, 0 2px 8px rgba(0,48,73,.2); }
`

// ════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════

function StatCard({ label, value, sub, accent, onClick, delay }) {
  return (
    <div className="dash-card stat-card" onClick={onClick}
      style={{ animationDelay:delay||'0ms' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:900, color:accent||'#1f2937', letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#9ca3af', marginTop:6 }}>{sub}</div>}
      {onClick && <div style={{ fontSize:11, color:'#d1d5db', marginTop:10, fontWeight:500 }}>Click to view →</div>}
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
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,48,73,0.5)', backdropFilter:'blur(2px)' }} />
      <div className="skolo-drawer" style={{ position:'relative', zIndex:1, width:'62%', maxWidth:700, background:'#fff', height:'100vh', display:'flex', flexDirection:'column', boxShadow:'-12px 0 40px rgba(0,0,0,.15)', animation:'drawerIn .3s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #f7f7f7', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'#1f2937' }}>Outstanding fees</div>
              <div style={{ fontSize:13, color:'#9ca3af', marginTop:2 }}>{entries.length} entries unpaid</div>
            </div>
            <button onClick={onClose} style={{ background:'#f7f7f7', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' }}>✕</button>
          </div>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search learner…"
            style={{ width:'100%', padding:'9px 13px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:14, outline:'none', background:'#fafafa', boxSizing:'border-box' }} />
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 28px 28px' }}>
          {filtered.map((e, i) => {
            const balance   = Number(e.amount_due) - Number(e.amount_paid)
            const isOverdue = e.status === 'overdue'
            return (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #fafafa', background: isOverdue ? '#fef4d6' : '' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1f2937' }}>
                    {e.learners?.first_name} {e.learners?.last_name}
                    {e.learners?.reference_no && <span style={{ marginLeft:8, fontSize:11, color:'#9ca3af', fontWeight:600 }}>#{e.learners.reference_no}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>
                    {e.learners?.classes?.grades?.name} {e.learners?.classes?.name} · {e.description}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                  <div style={{ fontWeight:800, fontSize:15, color: isOverdue ? '#b8870a' : '#374151' }}>{sym}{balance.toLocaleString()}</div>
                  <span style={{ fontSize:11, fontWeight:700, background: isOverdue?'#fef4d6':'#f7f7f7', color: isOverdue?'#b8870a':'#6b7280', padding:'1px 8px', borderRadius:20 }}>
                    {e.status}
                  </span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ textAlign:'center', color:'#9ca3af', fontSize:14, padding:40 }}>No results.</div>}
        </div>
        <div style={{ padding:'16px 28px', borderTop:'1px solid #f7f7f7', flexShrink:0 }}>
          <Link to="/fees" onClick={onClose}
            style={{ display:'block', textAlign:'center', padding:'11px', background:'#003049', color:'#fff', borderRadius:9, textDecoration:'none', fontSize:13, fontWeight:700 }}>
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
      <span style={{ color: isPrincipal && pending > 0 ? '#7c3aed' : '#1f2937' }}>
        {isPrincipal ? '✅ Waiver approvals' : '📋 Waiver requests'}
        {pending > 0 && (
          <span style={{ marginLeft:8, background:'#7c3aed', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:11, fontWeight:700 }}>
            {pending} pending
          </span>
        )}
      </span>
      <span style={{ color:'#9ca3af' }}>→</span>
    </Link>
  )
}


function AttendanceAlertsCard({ delay }) {
  const navigate = useNavigate()
  const now = new Date()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(80)

  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const monthLabel = MONTHS[month - 1]

  useEffect(() => {
    api.get(`/attendance-alerts?threshold=${threshold}&year=${year}&month=${month}`)
      .then(r => setAlerts(r.data?.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [threshold])

  const rateColor = rate => rate < 50 ? '#dc2626' : '#b8870a'

  return (
    <div className="dash-card" style={{ animationDelay: delay || '0ms' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Attendance alerts</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{monthLabel} {year} · below {threshold}%</div>
        </div>
        <select value={threshold} onChange={e => { setLoading(true); setThreshold(Number(e.target.value)) }}
          style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, fontWeight: 600, outline: 'none', background: '#fff', color: '#374151' }}>
          <option value={90}>90%</option>
          <option value={80}>80%</option>
          <option value={70}>70%</option>
          <option value={60}>60%</option>
        </select>
      </div>

      {loading && <div style={{ color: '#9ca3af', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>Loading…</div>}

      {!loading && alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>All learners above {threshold}% attendance</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>No alerts for {monthLabel}.</div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#b8870a', marginBottom: 10 }}>
            ⚠ {alerts.length} learner{alerts.length !== 1 ? 's' : ''} below {threshold}%
          </div>
          {alerts.slice(0, 6).map(a => (
            <div key={a.learner_id}
              onClick={() => navigate(`/learners/${a.learner_id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px',
                borderRadius: 9, marginBottom: 6, cursor: 'pointer', background: a.rate < 50 ? '#fff5f5' : '#fffbeb',
                border: `1px solid ${a.rate < 50 ? '#fca5a5' : '#fcd34d'}`, transition: 'background .1s' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>
                  {a.first_name} {a.last_name}
                  {a.reference_no && <span style={{ marginLeft: 6, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>#{a.reference_no}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                  {a.grade_name} {a.class_name} · {a.absent} absent of {a.total_days} days
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: rateColor(a.rate), flexShrink: 0, marginLeft: 8 }}>
                {a.rate}%
              </span>
            </div>
          ))}
          {alerts.length > 6 && (
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 6 }}>
              + {alerts.length - 6} more learner{alerts.length - 6 !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
// TEACHER DASHBOARD
// ════════════════════════════════════════════════════════════════

function TeacherDashboard() {
  const { school, user } = useAuth()
  const navigate = useNavigate()
  const now = new Date()

  const [timetable, setTimetable]   = useState(null)  // { teacher, slots }
  const [myClasses, setMyClasses]   = useState(null)   // { teacher, classes }
  const [events, setEvents]         = useState([])
  const [loading, setLoading]       = useState(true)

  // Chart data
  const [weekAttendance, setWeekAttendance] = useState([])
  const [classPerformance, setClassPerformance] = useState([])
  const [gradeDistribution, setGradeDistribution] = useState([])

  // Today's info
  const todayDow   = now.getDay()   // 0=Sun, 1=Mon...
  const todayNum   = todayDow >= 1 && todayDow <= 5 ? todayDow : 0  // 0 if weekend
  const todayStr   = now.toISOString().slice(0, 10)
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const periods    = school?.periods || []

  useEffect(() => {
    Promise.all([
      api.get('/timetable/my').catch(() => ({ data: { teacher: null, slots: [] } })),
      api.get('/teacher-classes/my').catch(() => ({ data: { teacher: null, classes: [] } })),
      api.get(`/events?from=${todayStr}`).catch(() => ({ data: [] })),
    ]).then(([tt, mc, ev]) => {
      setTimetable(tt.data)
      setMyClasses(mc.data)
      setEvents((ev.data || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  // ── Load chart data (after initial load) ──────────────────
  useEffect(() => {
    if (!myClasses?.classes?.length) return

    const classIds = myClasses.classes.map(c => c.class_id)
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri']

    // 1. Attendance trend for this week
    const monday = new Date(now)
    monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    const weekDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      return d.toISOString().slice(0, 10)
    })

    Promise.all(
      classIds.map(cid =>
        Promise.all(weekDates.map(date =>
          api.get(`/attendance/class/${cid}/register?date=${date}`)
            .then(r => ({ date, records: r.data || [] }))
            .catch(() => ({ date, records: [] }))
        ))
      )
    ).then(classResults => {
      const dayTotals = weekDates.map((date, di) => {
        let present = 0, absent = 0, late = 0
        classResults.forEach(classWeek => {
          const day = classWeek[di]
          day.records.forEach(r => {
            if (r.status === 'present') present++
            else if (r.status === 'absent') absent++
            else if (r.status === 'late') late++
          })
        })
        return { day: dayLabels[di], Present: present, Absent: absent, Late: late }
      })
      setWeekAttendance(dayTotals.filter(d => d.Present + d.Absent + d.Late > 0))
    }).catch(() => {})

    // 2. Class performance (avg marks per class, latest term)
    const currentTerm = now.getMonth() < 3 ? 'T1' : now.getMonth() < 6 ? 'T2' : now.getMonth() < 9 ? 'T3' : 'T4'
    Promise.all(
      myClasses.classes.map(tc =>
        api.get(`/exam-grades?class_id=${tc.class_id}&term=${currentTerm}`)
          .then(r => {
            const grades = r.data || []
            const marks = grades.filter(g => g.mark != null).map(g => Number(g.mark))
            const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m, 0) / marks.length) : 0
            return {
              class: `${tc.classes?.grades?.name || ''} ${tc.classes?.name || ''}`.trim(),
              avg,
              count: marks.length
            }
          })
          .catch(() => ({ class: tc.classes?.name || '?', avg: 0, count: 0 }))
      )
    ).then(results => {
      setClassPerformance(results.filter(r => r.count > 0))
    }).catch(() => {})

    // 3. Grade distribution across all classes
    const boundaries = school?.grade_boundaries || { A: 80, B: 70, C: 60, D: 50, F: 0 }
    Promise.all(
      classIds.map(cid =>
        api.get(`/exam-grades?class_id=${cid}&term=${currentTerm}`)
          .then(r => r.data || [])
          .catch(() => [])
      )
    ).then(allResults => {
      const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 }
      allResults.flat().forEach(g => {
        const m = Number(g.mark)
        if (isNaN(m)) return
        if (m >= boundaries.A) dist.A++
        else if (m >= boundaries.B) dist.B++
        else if (m >= boundaries.C) dist.C++
        else if (m >= boundaries.D) dist.D++
        else dist.F++
      })
      const total = Object.values(dist).reduce((s, v) => s + v, 0)
      if (total > 0) {
        setGradeDistribution([
          { name: 'A', value: dist.A, color: '#16a34a' },
          { name: 'B', value: dist.B, color: '#003049' },
          { name: 'C', value: dist.C, color: '#b8870a' },
          { name: 'D', value: dist.D, color: '#b8870a' },
          { name: 'F', value: dist.F, color: '#dc2626' },
        ].filter(d => d.value > 0))
      }
    }).catch(() => {})
  }, [myClasses])

  // ── Today's schedule ──────────────────────────────────────
  const todaySlots = useMemo(() => {
    if (!timetable?.slots || !todayNum) return []
    return timetable.slots
      .filter(s => s.day_of_week === todayNum)
      .sort((a, b) => a.period_number - b.period_number)
  }, [timetable, todayNum])

  // Find current period
  const currentPeriod = useMemo(() => {
    if (!periods.length) return null
    return periods.find(p => !p.isBreak && currentTime >= p.start && currentTime <= p.end)
  }, [periods, currentTime])

  const nextPeriod = useMemo(() => {
    if (!periods.length) return null
    return periods.find(p => !p.isBreak && p.start > currentTime)
  }, [periods, currentTime])

  // Build period lookup
  const periodMap = {}
  periods.forEach(p => { periodMap[p.number] = p })

  // ── Attendance check per class ────────────────────────────
  const [attendanceStatus, setAttendanceStatus] = useState({}) // classId → bool (taken today)
  useEffect(() => {
    if (!myClasses?.classes?.length) return
    const checks = myClasses.classes.map(tc =>
      api.get(`/attendance/class/${tc.class_id}/register?date=${todayStr}`)
        .then(r => {
          const records = r.data || []
          const anyMarked = records.some(l => l.status !== null)
          return { classId: tc.class_id, taken: anyMarked }
        })
        .catch(() => ({ classId: tc.class_id, taken: false }))
    )
    Promise.all(checks).then(results => {
      const map = {}
      results.forEach(r => { map[r.classId] = r.taken })
      setAttendanceStatus(map)
    })
  }, [myClasses])

  // ── Stats ─────────────────────────────────────────────────
  const totalClasses  = myClasses?.classes?.length || 0
  const totalLearners = (myClasses?.classes || []).reduce((s, c) => s + (c.classes?.learners?.filter(l => l.is_active)?.length || 0), 0)
  const attendanceTaken = Object.values(attendanceStatus).filter(Boolean).length
  const attendancePending = totalClasses - attendanceTaken

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  if (loading) return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div className="sk-skeleton" style={{ width: '40%', height: 24, borderRadius: 6 }} />
          <div className="sk-skeleton" style={{ width: '24%', height: 14, borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <SkeletonCard height={260} />
        <SkeletonCard height={260} />
      </div>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
          {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span style={{ marginLeft: 10, fontSize: 12, background: '#e6eff5', color: '#003049', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Teacher</span>
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard delay="0ms"   label="My classes"     value={totalClasses}    sub={`${totalLearners} learners total`} onClick={() => navigate('/my-classes')} />
        <StatCard delay="60ms"  label="Total learners" value={totalLearners}   sub={school?.name || ''} onClick={() => navigate('/my-classes')} />
        <StatCard delay="120ms" label="Attendance today" value={`${attendanceTaken}/${totalClasses}`}
          sub={attendancePending > 0 ? `${attendancePending} class${attendancePending !== 1 ? 'es' : ''} pending` : 'All done ✓'}
          accent={attendancePending === 0 ? '#16a34a' : '#b8870a'} onClick={() => navigate('/attendance')} />
        <StatCard delay="180ms" label="Today's lessons" value={todaySlots.length}
          sub={todayNum === 0 ? 'Weekend — no classes' : currentPeriod ? `Now: Period ${currentPeriod.number}` : nextPeriod ? `Next: ${nextPeriod.start}` : 'Done for today'}
          accent={todayNum === 0 ? '#6b7280' : '#003049'} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* ── Today's timetable ── */}
        <div className="dash-card" style={{ animationDelay: '240ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
                {todayNum ? `Today's Schedule` : 'Weekly Schedule'}
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                {todayNum ? DAY_NAMES[todayNum] : 'No classes on weekends'}
              </div>
            </div>
          </div>

          {/* No periods configured */}
          {periods.length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              Timetable not configured yet.<br/>
              <span style={{ fontSize: 12 }}>Ask your admin to set up periods in Settings.</span>
            </div>
          )}

          {/* Weekend */}
          {periods.length > 0 && !todayNum && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280' }}>Enjoy your weekend!</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Classes resume Monday.</div>
            </div>
          )}

          {/* Today's periods — colour coded: done (green), now (blue), upcoming (white) */}
          {periods.length > 0 && todayNum > 0 && periods.map((p, i) => {
            const isNow     = !p.isBreak && currentTime >= p.start && currentTime <= p.end
            const isPast    = currentTime > p.end
            const isFuture  = !isNow && !isPast
            const slot      = todaySlots.find(s => s.period_number === p.number)
            const tc        = slot?.teacher_classes

            if (p.isBreak) {
              return (
                <div key={i} style={{ padding: '6px 10px', margin: '4px 0', textAlign: 'center', fontSize: 11, fontWeight: 600,
                  color: isPast ? '#86efac' : '#b8870a',
                  background: isPast ? '#f0fdf4' : '#fefce8', borderRadius: 6 }}>
                  {isPast ? '✓' : '☕'} {p.label} ({p.start}–{p.end})
                </div>
              )
            }

            // Colour scheme: done=green, now=blue, upcoming=neutral
            const slotBg    = isPast ? '#f0fdf4' : isNow ? '#e6eff5' : slot ? '#fff' : '#fafafa'
            const slotBorder = isPast ? '1.5px solid #bbf7d0' : isNow ? '1.5px solid #c6dae7' : '1.5px solid #f7f7f7'
            const labelColor = isPast ? '#16a34a' : isNow ? '#003049' : '#1f2937'
            const descColor  = isPast ? '#86efac' : isNow ? '#669bbc' : '#6b7280'

            return (
              <div key={i} className={`tt-slot${isNow ? ' tt-now' : ''}`}
                style={{ background: slotBg, border: slotBorder }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPast && <span style={{ fontSize: 12, color: '#16a34a', flexShrink: 0 }}>✓</span>}
                    {isNow && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#003049', animation: 'pulse 2s infinite', flexShrink: 0 }} />}
                    {isFuture && slot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: labelColor }}>
                        {p.label}
                        <span style={{ fontWeight: 400, fontSize: 11, color: isPast ? '#86efac' : '#9ca3af', marginLeft: 8 }}>{p.start}–{p.end}</span>
                      </div>
                      {slot ? (
                        <div style={{ fontSize: 12, color: descColor, marginTop: 2 }}>
                          {tc?.classes?.grades?.name} {tc?.classes?.name}
                          {tc?.subject && <span style={{ color: isPast ? '#a7f3d0' : '#9ca3af' }}> · {tc.subject}</span>}
                          {slot.room && <span style={{ color: isPast ? '#a7f3d0' : '#9ca3af' }}> · 📍 {slot.room}</span>}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: isPast ? '#a7f3d0' : '#d1d5db', marginTop: 2, fontStyle: 'italic' }}>Free period</div>
                      )}
                    </div>
                  </div>
                  {isNow && <span style={{ fontSize: 10, fontWeight: 700, background: '#003049', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>NOW</span>}
                  {isPast && slot && <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', padding: '2px 8px' }}>Done</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Attendance status ── */}
          <div className="dash-card" style={{ animationDelay: '300ms' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 14 }}>
              Attendance — {now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            </div>

            {totalClasses === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>No classes assigned yet.</div>
            )}

            {(myClasses?.classes || []).map((tc, i) => {
              const cls   = tc.classes
              const taken = attendanceStatus[tc.class_id]
              const count = cls?.learners?.filter(l => l.is_active)?.length || 0

              return (
                <div key={tc.id}
                  onClick={() => navigate('/attendance')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 9, marginBottom: 6, cursor: 'pointer',
                    background: taken ? '#f0fdf4' : '#fff7ed',
                    border: `1px solid ${taken ? '#86efac' : '#fed7aa'}`,
                    transition: 'background .1s'
                  }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>
                      {cls?.grades?.name} {cls?.name}
                      {tc.is_home_class && <span style={{ marginLeft: 6, fontSize: 10, background: '#e5e7eb', padding: '1px 6px', borderRadius: 10, fontWeight: 600, color: '#6b7280' }}>Home</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{count} learners</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: taken ? '#dcfce7' : '#fef4d6',
                    color: taken ? '#16a34a' : '#b8870a'
                  }}>
                    {taken ? '✓ Taken' : 'Pending'}
                  </span>
                </div>
              )
            })}

            {totalClasses > 0 && attendancePending === 0 && (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 8 }}>
                All registers taken for today ✓
              </div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div className="dash-card" style={{ animationDelay: '360ms' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 14 }}>Quick actions</div>

            {attendancePending > 0 && (
              <Link to="/attendance" className="quick-link" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <span style={{ color: '#c2410c' }}>📋 Take attendance — {attendancePending} class{attendancePending !== 1 ? 'es' : ''} pending</span>
                <span style={{ color: '#9ca3af' }}>→</span>
              </Link>
            )}

            <Link to="/exam-grades" className="quick-link">
              <span>📝 Enter grades</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>

            <Link to="/my-classes" className="quick-link">
              <span>👥 My classes ({totalClasses})</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>

            <Link to="/announcements" className="quick-link">
              <span>📢 Announcements</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>

            <Link to="/events" className="quick-link">
              <span>📅 Events</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Analytics charts ── */}
      {(weekAttendance.length > 0 || classPerformance.length > 0 || gradeDistribution.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>

          {/* Attendance trend — bar chart */}
          {weekAttendance.length > 0 && (
            <div className="dash-card" style={{ animationDelay: '480ms' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>This week's attendance</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Across all your classes</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekAttendance} barSize={18} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="Present" fill="#16a34a" radius={[4,4,0,0]} />
                  <Bar dataKey="Late" fill="#b8870a" radius={[4,4,0,0]} />
                  <Bar dataKey="Absent" fill="#dc2626" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Class performance — horizontal bar chart */}
          {classPerformance.length > 0 && (
            <div className="dash-card" style={{ animationDelay: '540ms' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Class average marks</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Current term</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={classPerformance} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="class" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(val) => [`${val}%`, 'Average']} />
                  <Bar dataKey="avg" radius={[0,6,6,0]}>
                    {classPerformance.map((entry, i) => (
                      <Cell key={i} fill={entry.avg >= 70 ? '#16a34a' : entry.avg >= 50 ? '#b8870a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grade distribution — pie chart */}
          {gradeDistribution.length > 0 && (
            <div className="dash-card" style={{ animationDelay: '600ms' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Grade distribution</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>All subjects, current term</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={gradeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={40} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                      {gradeDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {gradeDistribution.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', minWidth: 18 }}>{d.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{d.value} learner{d.value !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming events ── */}
      {events.length > 0 && (
        <div className="dash-card" style={{ animationDelay: '660ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Upcoming events</div>
            <Link to="/events" style={{ fontSize: 12, color: '#003049', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 9 }}>
                <div style={{ width: 3, borderRadius: 4, flexShrink: 0, background: EVENT_COLORS[ev.event_type] || '#9ca3af' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.event_type && ` · ${ev.event_type}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Attendance alerts ── */}
      <AttendanceAlertsCard delay="720ms" />

      {/* ── Full week timetable (collapsed by default) ── */}
      {periods.length > 0 && timetable?.slots?.length > 0 && (
        <WeeklyTimetable periods={periods} slots={timetable.slots} todayNum={todayNum} />
      )}
    </>
  )
}


// ── Full week timetable card ──────────────────────────────────
function WeeklyTimetable({ periods, slots, todayNum }) {
  const [expanded, setExpanded] = useState(false)
  const teachablePeriods = periods.filter(p => !p.isBreak)

  const slotMap = {}
  slots.forEach(s => {
    const key = `${s.day_of_week}-${s.period_number}`
    if (!slotMap[key]) slotMap[key] = []
    slotMap[key].push(s)
  })

  const SLOT_COLORS = ['#003049','#16a34a','#d97706','#db2777','#7c3aed','#0891b2','#b8870a','#be185d']

  // Build color map per class for consistency
  const classColorMap = {}
  let colorIdx = 0
  slots.forEach(s => {
    const classId = s.teacher_classes?.classes?.id
    if (classId && !classColorMap[classId]) {
      classColorMap[classId] = SLOT_COLORS[colorIdx % SLOT_COLORS.length]
      colorIdx++
    }
  })

  return (
    <div className="dash-card" style={{ animationDelay: '480ms', marginTop: 16 }}>
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Weekly Timetable</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{teachablePeriods.length} periods · {slots.length} lessons</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textAlign: 'left', width: 90, borderBottom: '1px solid #e5e7eb' }}>Time</th>
                {[1,2,3,4,5].map(d => (
                  <th key={d} style={{
                    padding: '8px 6px', fontSize: 11, fontWeight: 700, textAlign: 'center',
                    borderBottom: '1px solid #e5e7eb',
                    color: d === todayNum ? '#003049' : '#6b7280',
                    background: d === todayNum ? '#e6eff5' : 'transparent'
                  }}>
                    {DAY_NAMES[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, pi) => {
                if (p.isBreak) {
                  return (
                    <tr key={pi}>
                      <td colSpan={6} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#b8870a', textAlign: 'center', background: '#fefce8', borderBottom: '1px solid #f7f7f7' }}>
                        ☕ {p.label} ({p.start}–{p.end})
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={pi} style={{ borderBottom: '1px solid #f7f7f7' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#6b7280', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.start}–{p.end}</div>
                    </td>
                    {[1,2,3,4,5].map(d => {
                      const key = `${d}-${p.number}`
                      const cellSlots = slotMap[key] || []
                      const isToday = d === todayNum

                      return (
                        <td key={d} style={{ padding: '4px', verticalAlign: 'top', background: isToday ? '#e6eff508' : 'transparent' }}>
                          {cellSlots.map(s => {
                            const tc = s.teacher_classes
                            const color = classColorMap[tc?.classes?.id] || '#6b7280'
                            return (
                              <div key={s.id} style={{ background: color + '14', borderLeft: `3px solid ${color}`, borderRadius: '0 6px 6px 0', padding: '5px 8px', marginBottom: 2 }}>
                                <div style={{ fontWeight: 600, fontSize: 11, color }}>{tc?.classes?.grades?.name} {tc?.classes?.name}</div>
                                {tc?.subject && <div style={{ fontSize: 10, color: '#9ca3af' }}>{tc.subject}</div>}
                              </div>
                            )
                          })}
                          {cellSlots.length === 0 && (
                            <div style={{ fontSize: 10, color: '#e5e7eb', textAlign: 'center', padding: '8px 0' }}>—</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
// RECHARTS CUSTOM TOOLTIP
// ════════════════════════════════════════════════════════════════

const ChartTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1f2937', padding: '10px 14px', borderRadius: 9, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#9ca3af' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{sym ? `${sym}${Number(p.value).toLocaleString()}` : `${p.value}%`}</span>
        </div>
      ))}
    </div>
  )
}

const CHART_COLORS = ['#003049', '#16a34a', '#f7c548', '#db2777', '#7c3aed', '#0891b2', '#b8870a', '#8b5cf6']


// ════════════════════════════════════════════════════════════════
// ADMIN / BURSAR DASHBOARD (balanced overview with charts)
// ════════════════════════════════════════════════════════════════

function AdminDashboard() {
  const { school, user } = useAuth()
  const navigate  = useNavigate()
  const sym       = school?.countries?.currency_symbol || 'R'
  const now       = new Date()
  const year      = now.getFullYear()
  const monthLabel = `${MONTHS[now.getMonth()]} ${year}`

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer]   = useState(false)
  const [ledger, setLedger]   = useState([])

  useEffect(() => {
    const thisMonth = `${year}-${String(now.getMonth()+1).padStart(2,'0')}`
    Promise.all([
      api.get('/dashboard/summary'),
      api.get(`/fee-ledger?month=${thisMonth}`),
    ]).then(([s, l]) => {
      setData(s.data)
      setLedger(l.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const unpaidEntries = ledger.filter(e => e.status !== 'paid')
  const monthBalance  = ledger.reduce((s,e) => s + Number(e.amount_due) - Number(e.amount_paid), 0)

  const rc = r => r >= 80 ? '#16a34a' : '#b8870a'

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  if (loading) return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div className="sk-skeleton" style={{ width: '40%', height: 24, borderRadius: 6 }} />
          <div className="sk-skeleton" style={{ width: '24%', height: 14, borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <SkeletonCard height={260} />
        <SkeletonCard height={260} />
      </div>
    </div>
  )

  const fs = data?.feeStats || {}

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
          {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span style={{ marginLeft: 10, fontSize: 12, background: '#e6eff5', color: '#003049', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
            {user?.role === 'bursar' ? 'Bursar' : 'Admin'}
          </span>
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard delay="0ms"   label="Total learners"     value={data?.learnerCount || 0}
          sub={`${data?.teacherCount || 0} teachers · ${data?.classCount || 0} classes`} onClick={() => navigate('/learners')} />
        <StatCard delay="60ms"  label="Fee collection"     value={`${fs.collectionRate || 0}%`}
          sub={`${sym}${(fs.totalPaid||0).toLocaleString()} of ${sym}${(fs.totalDue||0).toLocaleString()}`}
          accent={rc(fs.collectionRate || 0)} onClick={() => navigate('/fees')} />
        <StatCard delay="120ms" label="Attendance rate"     value={data?.attendanceRate != null ? `${data.attendanceRate}%` : '—'}
          sub={`${monthLabel} school-wide`}
          accent={rc(data?.attendanceRate || 0)} onClick={() => navigate('/attendance')} />
        <StatCard delay="180ms" label="Outstanding"         value={`${sym}${(fs.outstanding||0).toLocaleString()}`}
          sub={fs.overdueCount > 0 ? `${fs.overdueCount} overdue entries` : 'No overdue fees'}
          accent={fs.outstanding > 0 ? '#b8870a' : '#16a34a'} onClick={() => setDrawer(true)} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* ── Monthly fee trend (Recharts bar chart) ── */}
        <div className="dash-card" style={{ animationDelay: '240ms' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Fee collection trend</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Last 6 months — due vs collected</div>
          {data?.monthlyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyTrend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip sym={sym} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="due" name="Due" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              No fee data for this year yet.
            </div>
          )}
        </div>

        {/* ── Attendance by grade (Recharts bar chart) ── */}
        <div className="dash-card" style={{ animationDelay: '300ms' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Attendance by grade</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>{monthLabel} — attendance rate %</div>
          {data?.attGradeStats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.attGradeStats} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                  axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="rate" name="Attendance" radius={[0, 6, 6, 0]}>
                  {(data.attGradeStats || []).map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 80 ? '#16a34a' : entry.rate >= 60 ? '#f7c548' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              No attendance data for this month yet.
            </div>
          )}
        </div>
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* ── Fee collection by grade (CSS bars + data) ── */}
        <div className="dash-card" style={{ animationDelay: '360ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Collection by grade</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{year} year to date</div>
            </div>
            <Link to="/fees" style={{ fontSize: 12, color: '#003049', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          {(data?.feeGradeStats || []).length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              No fee entries yet.<br/>
              <Link to="/settings" style={{ color: '#003049', fontWeight: 600 }}>Check fee plans →</Link>
            </div>
          )}
          {(data?.feeGradeStats || []).map(g => (
            <div key={g.name} className="grade-row">
              <div style={{ width: 68, fontSize: 13, fontWeight: 600, color: '#1f2937', flexShrink: 0 }}>{g.name}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${g.rate}%`, background: rc(g.rate) }} />
              </div>
              <div style={{ width: 34, textAlign: 'right', fontSize: 12, fontWeight: 800, color: rc(g.rate), flexShrink: 0 }}>{g.rate}%</div>
              <div style={{ width: 110, textAlign: 'right', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                {sym}{g.paid.toLocaleString()}/{sym}{g.due.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick actions + Events ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="dash-card" style={{ animationDelay: '360ms' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 14 }}>Quick actions</div>

            {unpaidEntries.length > 0 && (
              <button className="quick-link" onClick={() => setDrawer(true)}
                style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <span style={{ color: '#c2410c' }}>
                  💰 {unpaidEntries.length} unpaid — {sym}{monthBalance.toLocaleString()} outstanding
                </span>
                <span style={{ color: '#9ca3af' }}>→</span>
              </button>
            )}

            <WaiverQueueLink isPrincipal={false} />

            <Link to="/fees" className="quick-link">
              <span>📋 Fee overview</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
            <Link to="/learners" className="quick-link">
              <span>🎒 Learners ({data?.learnerCount || 0})</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
            <Link to="/announcements" className="quick-link">
              <span>📢 Send announcement</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
            <Link to="/settings" className="quick-link">
              <span>⚙ Settings</span>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
          </div>

          {/* Events */}
          <div className="dash-card" style={{ flex: 1, animationDelay: '420ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Upcoming events</div>
              <Link to="/events" style={{ fontSize: 12, color: '#003049', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
            </div>
            {(data?.upcomingEvents || []).length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>
                No events. <Link to="/events" style={{ color: '#003049', fontWeight: 600, textDecoration: 'none' }}>Add one →</Link>
              </div>
            )}
            {(data?.upcomingEvents || []).map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #fafafa' }}>
                <div style={{ width: 3, borderRadius: 4, flexShrink: 0, background: EVENT_COLORS[ev.event_type] || '#9ca3af' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.event_type && ` · ${ev.event_type}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Attendance alerts ── */}
      <AttendanceAlertsCard delay="480ms" />

      {/* Outstanding drawer */}
      {drawer && <OutstandingDrawer entries={unpaidEntries} sym={sym} onClose={() => setDrawer(false)} />}
    </>
  )
}


// ════════════════════════════════════════════════════════════════
// PRINCIPAL DASHBOARD (high-level KPIs)
// ════════════════════════════════════════════════════════════════

function PrincipalDashboard() {
  const { school, user } = useAuth()
  const navigate  = useNavigate()
  const sym       = school?.countries?.currency_symbol || 'R'
  const now       = new Date()
  const year      = now.getFullYear()
  const monthLabel = `${MONTHS[now.getMonth()]} ${year}`

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/summary').then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const rc = r => r >= 80 ? '#16a34a' : '#b8870a'

  if (loading) return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div className="sk-skeleton" style={{ width: '40%', height: 24, borderRadius: 6 }} />
          <div className="sk-skeleton" style={{ width: '24%', height: 14, borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <SkeletonCard height={260} />
        <SkeletonCard height={260} />
      </div>
    </div>
  )

  const fs = data?.feeStats || {}

  // Learner distribution by grade for pie chart
  const gradeDistribution = Object.entries(data?.learnersByGrade || {}).map(([name, count], i) => ({
    name, value: count, fill: CHART_COLORS[i % CHART_COLORS.length]
  }))

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
          {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span style={{ marginLeft: 10, fontSize: 12, background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Principal</span>
        </p>
      </div>

      {/* Big KPI cards — 3x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>

        {/* Learners */}
        <div className="dash-card stat-card" onClick={() => navigate('/learners')}
          style={{ animationDelay: '0ms', textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Total learners</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#1f2937', letterSpacing: '-1px', lineHeight: 1 }}>{data?.learnerCount || 0}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>{data?.classCount || 0} classes</div>
        </div>

        {/* Teachers */}
        <div className="dash-card stat-card" style={{ animationDelay: '60ms', textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Teaching staff</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#1f2937', letterSpacing: '-1px', lineHeight: 1 }}>{data?.teacherCount || 0}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
            {data?.learnerCount && data?.teacherCount
              ? `1:${Math.round(data.learnerCount / data.teacherCount)} ratio`
              : '—'}
          </div>
        </div>

        {/* Attendance */}
        <div className="dash-card stat-card" onClick={() => navigate('/attendance')}
          style={{ animationDelay: '120ms', textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Attendance rate</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: rc(data?.attendanceRate || 0), letterSpacing: '-1px', lineHeight: 1 }}>
            {data?.attendanceRate != null ? `${data.attendanceRate}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>{monthLabel}</div>
        </div>

        {/* Fee collection */}
        <div className="dash-card stat-card" onClick={() => navigate('/fees')}
          style={{ animationDelay: '180ms', textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Fee collection</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: rc(fs.collectionRate || 0), letterSpacing: '-1px', lineHeight: 1 }}>
            {fs.collectionRate || 0}%
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
            {sym}{(fs.totalPaid||0).toLocaleString()} collected
          </div>
        </div>

        {/* Outstanding */}
        <div className="dash-card stat-card"
          style={{ animationDelay: '240ms', textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Outstanding</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: fs.outstanding > 0 ? '#b8870a' : '#16a34a', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {sym}{(fs.outstanding||0).toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
            {fs.overdueCount > 0 ? `${fs.overdueCount} overdue` : 'No overdue'}
          </div>
        </div>

        {/* Pending waivers */}
        <div className="dash-card stat-card" onClick={() => navigate('/waivers')}
          style={{ animationDelay: '300ms', textAlign: 'center', padding: '28px 20px',
            border: (data?.pendingWaivers || 0) > 0 ? '2px solid #c4b5fd' : '2px solid transparent',
            background: (data?.pendingWaivers || 0) > 0 ? '#faf5ff' : '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: (data?.pendingWaivers || 0) > 0 ? '#7c3aed' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
            Waiver approvals
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: (data?.pendingWaivers || 0) > 0 ? '#7c3aed' : '#1f2937', letterSpacing: '-1px', lineHeight: 1 }}>
            {data?.pendingWaivers || 0}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
            {(data?.pendingWaivers || 0) > 0 ? 'Needs your review' : 'All clear'}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* Learner distribution pie */}
        <div className="dash-card" style={{ animationDelay: '360ms' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Learner distribution</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>By grade</div>
          {gradeDistribution.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={gradeDistribution} dataKey="value" cx="50%" cy="50%"
                    innerRadius={40} outerRadius={75} paddingAngle={2}>
                    {gradeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} learners`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {gradeDistribution.map((g, i) => (
                  <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: g.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', flex: 1 }}>{g.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              No learner data yet.
            </div>
          )}
        </div>

        {/* Fee trend chart */}
        <div className="dash-card" style={{ animationDelay: '420ms' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Fee collection trend</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Last 6 months</div>
          {data?.monthlyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.monthlyTrend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip sym={sym} />} />
                <Bar dataKey="due" name="Due" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              No fee data yet.
            </div>
          )}
        </div>
      </div>

      {/* Upcoming events */}
      {(data?.upcomingEvents || []).length > 0 && (
        <div className="dash-card" style={{ animationDelay: '480ms', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Upcoming events</div>
            <Link to="/events" style={{ fontSize: 12, color: '#003049', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {(data?.upcomingEvents || []).map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 9 }}>
                <div style={{ width: 3, borderRadius: 4, flexShrink: 0, background: EVENT_COLORS[ev.event_type] || '#9ca3af' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.event_type && ` · ${ev.event_type}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance alerts */}
      <AttendanceAlertsCard delay="540ms" />
    </>
  )
}


// ════════════════════════════════════════════════════════════════
// MAIN EXPORT — routes to the right dashboard by role
// ════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'teacher')   return <TeacherDashboard />
  if (user?.role === 'principal') return <PrincipalDashboard />
  return <AdminDashboard />
}
