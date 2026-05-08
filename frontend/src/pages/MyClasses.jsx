import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.class-card { background:#fff; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,.06); overflow:hidden; animation:fadeUp .3s ease both; }
.learner-row { display:flex; justify-content:space-between; align-items:center; padding:11px 20px; border-top:1px solid #fafafa; cursor:pointer; transition:background .1s; }
.learner-row:hover { background:#fafafa; }
.stat-pill { display:flex; flex-direction:column; align-items:center; padding:10px 0; flex:1; min-width:0; }
.action-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:8px; font-size:12px;
  font-weight:600; cursor:pointer; border:1.5px solid #e5e7eb; background:#fff; color:#374151;
  transition:all .12s; text-decoration:none; }
.action-chip:hover { background:#fafafa; border-color:#d1d5db; transform:translateY(-1px); }
.progress-bar-sm { height:5px; border-radius:10px; background:#f7f7f7; overflow:hidden; width:100%; }
.progress-fill-sm { height:100%; border-radius:10px; transition:width .6s ease; }
`

const GRADE_COLORS = { A:'#16a34a', B:'#003049', C:'#ca8a04', D:'#ea580c', F:'#dc2626' }

export default function MyClasses() {
  const { user, school } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()
  const todayStr = new Date().toISOString().slice(0, 10)

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState({})

  // Enrichment data per class
  const [classStats, setClassStats] = useState({}) // classId → { attendanceRate, avgMark, gradeLabel, attendanceToday }

  useEffect(() => {
    api.get('/teacher-classes/my')
      .then(r => {
        setData(r.data)
        const expanded = {}
        ;(r.data.classes || []).forEach((c, i) => {
          if (c.is_home_class || i === 0) expanded[c.class_id] = true
        })
        setOpen(expanded)
        setLoading(false)
      })
      .catch(err => {
        if (err.response?.status === 404) {
          toast.error('No teacher record linked to your account. Contact your admin.')
        }
        setLoading(false)
      })
  }, [])

  // Load enrichment data for each class
  useEffect(() => {
    if (!data?.classes?.length) return

    const boundaries = school?.grade_boundaries || { A: 80, B: 70, C: 60, D: 50, F: 0 }
    const currentTerm = new Date().getMonth() < 3 ? 'T1' : new Date().getMonth() < 6 ? 'T2' : new Date().getMonth() < 9 ? 'T3' : 'T4'

    data.classes.forEach(tc => {
      const cid = tc.class_id
      const learnerCount = tc.classes?.learners?.filter(l => l.is_active)?.length || 0

      Promise.all([
        // Attendance this month (approx last 20 school days)
        api.get(`/attendance/monthly-summary?class_id=${cid}`).catch(() => ({ data: {} })),
        // Attendance today
        api.get(`/attendance/class/${cid}/register?date=${todayStr}`).catch(() => ({ data: [] })),
        // Exam grades current term
        api.get(`/exam-grades?class_id=${cid}&term=${currentTerm}`).catch(() => ({ data: [] })),
      ]).then(([monthRes, todayRes, gradesRes]) => {
        // Attendance rate from monthly summary
        const summary = monthRes.data
        let attendanceRate = null
        if (summary?.total_records > 0) {
          attendanceRate = Math.round(((summary.present || 0) + (summary.late || 0)) / summary.total_records * 100)
        }

        // Today's attendance check
        const todayRecords = todayRes.data || []
        const attendanceToday = todayRecords.some(l => l.status !== null)

        // Avg mark & grade label
        const marks = (gradesRes.data || []).filter(g => g.mark != null).map(g => Number(g.mark))
        let avgMark = null, gradeLabel = null
        if (marks.length) {
          avgMark = Math.round(marks.reduce((s, m) => s + m, 0) / marks.length)
          if (avgMark >= boundaries.A) gradeLabel = 'A'
          else if (avgMark >= boundaries.B) gradeLabel = 'B'
          else if (avgMark >= boundaries.C) gradeLabel = 'C'
          else if (avgMark >= boundaries.D) gradeLabel = 'D'
          else gradeLabel = 'F'
        }

        setClassStats(prev => ({
          ...prev,
          [cid]: { attendanceRate, attendanceToday, avgMark, gradeLabel, marksCount: marks.length }
        }))
      })
    })
  }, [data])

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }))

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading your classes…</div>
  )

  if (!data) return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937', marginBottom: 8 }}>No teacher record found</div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>
        Ask your admin to link your account to a teacher record in Settings → Teachers.
      </div>
    </div>
  )

  const totalLearners = (data.classes || []).reduce((s, c) => {
    return s + (c.classes?.learners?.filter(l => l.is_active)?.length || 0)
  }, 0)

  return (
    <>
      <style>{CSS}</style>
      <div>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>
            My Classes
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
            {data.teacher.full_name} · {data.classes.length} class{data.classes.length !== 1 ? 'es' : ''} · {totalLearners} learners
          </p>
        </div>

        {/* No classes */}
        {data.classes.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📚</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No classes assigned yet</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Ask your admin to assign you to a class in Settings → Teachers.</div>
          </div>
        )}

        {/* Class cards */}
        {data.classes.map((tc, idx) => {
          const cls      = tc.classes
          const learners = (cls?.learners || []).filter(l => l.is_active)
          const isOpen   = !!open[tc.class_id]
          const stats    = classStats[tc.class_id] || {}

          return (
            <div key={tc.id} className="class-card" style={{ marginBottom: 16, animationDelay: `${idx * 80}ms` }}>

              {/* Class header */}
              <div onClick={() => toggle(tc.class_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer',
                  background: tc.is_home_class ? '#003049' : '#fafafa' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: tc.is_home_class ? '#fff' : '#1f2937' }}>
                      {cls?.grades?.name} {cls?.name}
                    </span>
                    {tc.is_home_class && (
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        Home class
                      </span>
                    )}
                    {tc.subject && (
                      <span style={{ fontSize: 11, background: tc.is_home_class ? 'rgba(255,255,255,0.15)' : '#f0f5fa', color: tc.is_home_class ? 'rgba(255,255,255,0.8)' : '#003049', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        {tc.subject}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: tc.is_home_class ? 'rgba(255,255,255,0.6)' : '#6b7280', marginTop: 2 }}>
                    {learners.length} learner{learners.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={tc.is_home_class ? 'rgba(255,255,255,0.6)' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Stats bar — always visible */}
              <div style={{ display: 'flex', borderBottom: isOpen ? '1px solid #f7f7f7' : 'none', padding: '12px 20px', gap: 8 }}>
                {/* Attendance rate */}
                <div className="stat-pill">
                  <div style={{ fontSize: 18, fontWeight: 800, color: stats.attendanceRate != null ? (stats.attendanceRate >= 80 ? '#16a34a' : stats.attendanceRate >= 60 ? '#ca8a04' : '#dc2626') : '#d1d5db' }}>
                    {stats.attendanceRate != null ? `${stats.attendanceRate}%` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Attendance</div>
                  {stats.attendanceRate != null && (
                    <div className="progress-bar-sm" style={{ marginTop: 6, maxWidth: 60 }}>
                      <div className="progress-fill-sm" style={{
                        width: `${stats.attendanceRate}%`,
                        background: stats.attendanceRate >= 80 ? '#16a34a' : stats.attendanceRate >= 60 ? '#ca8a04' : '#dc2626'
                      }} />
                    </div>
                  )}
                </div>

                {/* Average mark */}
                <div className="stat-pill">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: stats.avgMark != null ? '#1f2937' : '#d1d5db' }}>
                      {stats.avgMark != null ? `${stats.avgMark}%` : '—'}
                    </span>
                    {stats.gradeLabel && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: GRADE_COLORS[stats.gradeLabel] || '#9ca3af' }}>
                        {stats.gradeLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Avg mark</div>
                  {stats.avgMark != null && (
                    <div className="progress-bar-sm" style={{ marginTop: 6, maxWidth: 60 }}>
                      <div className="progress-fill-sm" style={{
                        width: `${stats.avgMark}%`,
                        background: GRADE_COLORS[stats.gradeLabel] || '#9ca3af'
                      }} />
                    </div>
                  )}
                </div>

                {/* Attendance today */}
                <div className="stat-pill">
                  <div style={{ fontSize: 18 }}>
                    {stats.attendanceToday === true ? '✅' : stats.attendanceToday === false ? '⏳' : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>
                    {stats.attendanceToday ? 'Taken' : 'Register'}
                  </div>
                </div>

                {/* Learner count */}
                <div className="stat-pill">
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>{learners.length}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Learners</div>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ padding: '10px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: isOpen ? '1px solid #f7f7f7' : 'none' }}>
                <Link to="/attendance" className="action-chip" style={{
                  background: !stats.attendanceToday ? '#fff7ed' : '#f0fdf4',
                  borderColor: !stats.attendanceToday ? '#fed7aa' : '#86efac',
                  color: !stats.attendanceToday ? '#c2410c' : '#16a34a'
                }}>
                  📋 {stats.attendanceToday ? 'View register' : 'Take attendance'}
                </Link>
                <Link to="/exam-grades" className="action-chip">
                  📝 Enter grades
                </Link>
                <Link to="/messages" className="action-chip">
                  💬 Message parents
                </Link>
              </div>

              {/* Learner list (expandable) */}
              {isOpen && (
                <div>
                  {learners.length === 0 && (
                    <div style={{ padding: '20px 20px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                      No active learners in this class.
                    </div>
                  )}
                  {learners.map(l => (
                    <div key={l.id} className="learner-row"
                      onClick={() => navigate(`/learners/${l.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: '#f7f7f7', borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
                          {l.first_name[0]}{l.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
                            {l.first_name} {l.last_name}
                          </div>
                          {l.reference_no && (
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>#{l.reference_no}</div>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
