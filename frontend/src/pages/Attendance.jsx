import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

const STATUS = [
  { key: 'present', label: 'P', full: 'Present', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  { key: 'absent',  label: 'A', full: 'Absent',  color: '#dc2626', bg: '#fff5f5', border: '#fca5a5' },
  { key: 'late',    label: 'L', full: 'Late',    color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { key: 'excused', label: 'E', full: 'Excused', color: '#003049', bg: '#e6eff5', border: '#c6dae7' },
]
const STATUS_MAP = Object.fromEntries(STATUS.map(s => [s.key, s]))

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = d => {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
}
const monthName = (y, m) => new Date(y, m - 1, 1).toLocaleString('en-GB', { month:'long', year:'numeric' })

export default function Attendance() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isTeacher   = user?.role === 'teacher'
  const isAdmin     = user?.role === 'admin'
  const isPrincipal = user?.role === 'principal'
  const canOverride = isAdmin || isPrincipal

  const [tab, setTab] = useState('register')
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [className, setClassName] = useState('')

  useEffect(() => {
    api.get('/attendance/classes').then(r => {
      setClasses(r.data)
      if (r.data.length === 1) {
        setClassId(r.data[0].id)
        setClassName(`${r.data[0].grades?.name || ''} ${r.data[0].name}`.trim())
      }
    }).catch(() => {})
  }, [])

  function handleClassChange(e) {
    const id = e.target.value
    setClassId(id)
    const cls = classes.find(c => c.id === id)
    setClassName(cls ? `${cls.grades?.name || ''} ${cls.name}`.trim() : '')
  }

  const tabStyle = active => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    background: active ? '#003049' : '#f7f7f7',
    color: active ? '#fff' : '#6b7280',
    transition: 'all .15s'
  })

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1050, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937' }}>Attendance</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Daily register, monthly summary and learner history</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f7f7f7', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {['register', 'summary', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === 'register' ? '📋 Register' : t === 'summary' ? '📊 Monthly Summary' : '👤 Learner History'}
          </button>
        ))}
      </div>

      {/* Class selector — shared across tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={lbl}>Class</label>
          <select style={sel} value={classId} onChange={handleClassChange}>
            <option value="">Select class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.grades?.name || ''} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'register' && (
        <RegisterTab classId={classId} className={className} canOverride={canOverride} isTeacher={isTeacher} showToast={showToast} userRole={user?.role} />
      )}
      {tab === 'summary' && (
        <SummaryTab classId={classId} className={className} />
      )}
      {tab === 'history' && (
        <HistoryTab classId={classId} className={className} schoolId={user?.school_id} />
      )}
    </div>
  )
}

// ── Register Tab ──────────────────────────────────────────────
function RegisterTab({ classId, canOverride, isTeacher, showToast, userRole }) {
  const [date,     setDate]     = useState(today())
  const [learners, setLearners] = useState([])
  const [marks,    setMarks]    = useState({})   // { learner_id: { status, note } }
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [override, setOverride] = useState(false) // admin edit override
  const [meta,     setMeta]     = useState(null)  // who last saved

  // Teachers can always edit; admin/principal need override toggle
  const readOnly = canOverride ? !override : false

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/attendance/class/${classId}/register?date=${date}`)
      // Backend now returns { learners, register_meta }
      const list = data.learners || data
      setLearners(list)
      setMeta(data.register_meta || null)
      const m = {}
      list.forEach(l => { m[l.id] = { status: l.status || 'present', note: l.note || '' } })
      setMarks(m)
      setDirty(false)
      setOverride(false)
    } catch { showToast('Failed to load register', 'error') }
    finally { setLoading(false) }
  }, [classId, date])

  useEffect(() => { load() }, [load])

  function setStatus(id, status) {
    if (readOnly) return
    setMarks(m => ({ ...m, [id]: { ...m[id], status } }))
    setDirty(true)
  }

  function setNote(id, note) {
    if (readOnly) return
    setMarks(m => ({ ...m, [id]: { ...m[id], note } }))
    setDirty(true)
  }

  function markAll(status) {
    if (readOnly) return
    const m = {}
    learners.forEach(l => { m[l.id] = { status, note: marks[l.id]?.note || '' } })
    setMarks(m)
    setDirty(true)
  }

  function shiftDate(days) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  async function save() {
    setSaving(true)
    try {
      const records = learners.map(l => ({
        learner_id: l.id,
        status: marks[l.id]?.status || 'present',
        note:   marks[l.id]?.note   || null
      }))
      await api.post('/attendance/bulk', { class_id: classId, date, records })
      setDirty(false)
      if (canOverride) setOverride(false) // lock editing after admin save
      showToast(`Register saved — ${records.length} learners`, 'success')
      load() // reload to update submission metadata
    } catch { showToast('Failed to save register', 'error') }
    finally { setSaving(false) }
  }

  const counts = STATUS.map(s => ({
    ...s, count: learners.filter(l => (marks[l.id]?.status || 'present') === s.key).length
  }))

  if (!classId) return <Empty msg="Select a class above to take the register" />

  return (
    <div>
      {/* Date toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => shiftDate(-1)} style={navBtn}>‹</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          max={today()}
          style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none' }} />
        <button onClick={() => shiftDate(1)} disabled={date >= today()} style={navBtn}>›</button>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>{fmtDate(date)}</span>

        {!readOnly && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Mark all:</span>
            {STATUS.map(s => (
              <button key={s.key} onClick={() => markAll(s.key)} style={{
                padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${s.border}`,
                background: s.bg, color: s.color, fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}>{s.full}</button>
            ))}
          </div>
        )}
      </div>

      {/* Admin/Principal read-only banner + override toggle */}
      {canOverride && learners.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: 10, marginBottom: 14, flexWrap: 'wrap', gap: 10,
          background: override ? '#fffbeb' : '#e6eff5',
          border: `1px solid ${override ? '#fcd34d' : '#e6eff5'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{override ? '⚠️' : '👁️'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: override ? '#92400e' : '#00253a' }}>
              {override
                ? `Editing as ${userRole} — changes will be logged as an admin override`
                : `Viewing as ${userRole} — attendance is managed by the class teacher`}
            </span>
          </div>
          <button
            onClick={() => setOverride(o => !o)}
            style={{
              padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, transition: 'all .15s',
              background: override ? '#b8870a' : '#003049',
              color: '#fff'
            }}
          >
            {override ? '🔒 Lock editing' : '✏️ Edit override'}
          </button>
        </div>
      )}

      {/* Submission info — who last saved this register */}
      {meta && canOverride && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 8, background: '#fafafa', border: '1px solid #e5e7eb',
          marginBottom: 14, fontSize: 12, color: '#6b7280'
        }}>
          <span style={{ fontWeight: 700, color: '#1f2937' }}>Last saved by:</span>
          <span style={{ fontWeight: 600, color: meta.saved_by_role === 'teacher' ? '#16a34a' : '#d97706' }}>
            {meta.saved_by}
          </span>
          <span style={{
            padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.3px',
            background: meta.saved_by_role === 'teacher' ? '#f0fdf4' : '#fffbeb',
            color: meta.saved_by_role === 'teacher' ? '#16a34a' : '#d97706',
            border: `1px solid ${meta.saved_by_role === 'teacher' ? '#86efac' : '#fcd34d'}`
          }}>
            {meta.saved_by_role}
          </span>
          <span>·</span>
          <span>{new Date(meta.saved_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Stats */}
      {learners.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {counts.map(s => (
            <div key={s.key} style={{ flex: '1 1 80px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.full}</div>
            </div>
          ))}
        </div>
      )}

      {/* Register grid */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : learners.length === 0 ? (
          <Empty msg="No active learners in this class" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>Learner</th>
                <th style={{ ...th, textAlign: 'left' }}>Ref</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'left' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l, i) => {
                const status = marks[l.id]?.status || 'present'
                const note   = marks[l.id]?.note   || ''
                const s = STATUS_MAP[status]
                const editedByOther = l.marked_by_role && l.marked_by_role !== 'teacher'
                return (
                  <tr key={l.id} style={{ borderBottom: i < learners.length - 1 ? '1px solid #f7f7f7' : 'none', background: editedByOther ? '#fffbeb' : (i % 2 === 0 ? '#fff' : '#fafafa') }}>
                    <td style={{ ...td, color: '#9ca3af', width: 40 }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1f2937', textAlign: 'left' }}>
                      {l.last_name}, {l.first_name}
                      {editedByOther && (
                        <span style={{
                          display: 'inline-block', marginLeft: 6, padding: '1px 6px', borderRadius: 8,
                          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
                          background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d'
                        }}>
                          edited by {l.marked_by_role}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: 12, textAlign: 'left' }}>{l.reference_no || '—'}</td>
                    <td style={{ ...td, width: 220 }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {STATUS.map(opt => (
                          <button key={opt.key} onClick={() => setStatus(l.id, opt.key)}
                            disabled={readOnly}
                            style={{
                              width: 38, height: 32, borderRadius: 7,
                              border: `1.5px solid ${status === opt.key ? opt.border : '#e5e7eb'}`,
                              background: status === opt.key ? opt.bg : '#fff',
                              color: status === opt.key ? opt.color : '#9ca3af',
                              fontWeight: 700, fontSize: 13,
                              cursor: readOnly ? 'default' : 'pointer',
                              transition: 'all .1s'
                            }}>{opt.label}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <input
                        value={note}
                        onChange={e => setNote(l.id, e.target.value)}
                        disabled={readOnly}
                        placeholder={readOnly ? '' : 'Optional note…'}
                        style={{ width: '100%', maxWidth: 200, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none', background: readOnly ? 'transparent' : '#fff', color: '#374151' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Save */}
      {!readOnly && learners.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 28px', background: dirty ? (canOverride ? '#d97706' : '#003049') : '#9ca3af', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background .2s' }}>
            {saving ? 'Saving…' : dirty ? (canOverride ? '⚠️ Save as admin override' : '💾 Save register') : 'Saved ✓'}
          </button>
        </div>
      )}

      {/* Sticky bar when dirty */}
      {dirty && !readOnly && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#003049', color: '#fff', padding: '12px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Unsaved register</span>
          <button onClick={save} disabled={saving} style={{ background: '#fff', color: '#003049', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save now'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Summary Tab ───────────────────────────────────────────────
function SummaryTab({ classId }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data,  setData]  = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const { data: res } = await api.get(`/attendance/class/${classId}/summary?year=${year}&month=${month}`)
      setData(res)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [classId, year, month])

  useEffect(() => { load() }, [load])

  function shiftMonth(d) {
    let m = month + d, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1)  { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  function pctColor(pct) {
    if (pct === null) return '#9ca3af'
    if (pct >= 90) return '#16a34a'
    return '#b8870a'
  }

  if (!classId) return <Empty msg="Select a class above" />

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => shiftMonth(-1)} style={navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', minWidth: 140, textAlign: 'center' }}>{monthName(year, month)}</span>
        <button onClick={() => shiftMonth(1)} style={navBtn}>›</button>
        {data && <span style={{ fontSize: 13, color: '#6b7280' }}>{data.school_days} school day{data.school_days !== 1 ? 's' : ''} recorded</span>}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : !data || data.learners.length === 0 ? (
          <Empty msg="No attendance data for this period" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ ...th, textAlign: 'left' }}>Learner</th>
                {STATUS.map(s => <th key={s.key} style={{ ...th, color: s.color }}>{s.full}</th>)}
                <th style={th}>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {data.learners.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < data.learners.length - 1 ? '1px solid #f7f7f7' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>{l.last_name}, {l.first_name}</td>
                  {STATUS.map(s => (
                    <td key={s.key} style={{ ...td }}>
                      <span style={{ fontWeight: 700, color: l[s.key] > 0 ? s.color : '#9ca3af' }}>{l[s.key] || 0}</span>
                    </td>
                  ))}
                  <td style={{ ...td }}>
                    {l.pct !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 6, background: '#f7f7f7', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${l.pct}%`, height: '100%', background: pctColor(l.pct), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: pctColor(l.pct), fontSize: 13 }}>{l.pct}%</span>
                      </div>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Learner History Tab ───────────────────────────────────────
function HistoryTab({ classId }) {
  const now = new Date()
  const [year,      setYear]      = useState(now.getFullYear())
  const [month,     setMonth]     = useState(now.getMonth() + 1)
  const [learners,  setLearners]  = useState([])
  const [learnerId, setLearnerId] = useState('')
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(false)

  // Load learner list when class changes
  useEffect(() => {
    if (!classId) return
    api.get(`/attendance/class/${classId}/register?date=${new Date().toISOString().slice(0,10)}`)
      .then(r => { setLearners(r.data); setLearnerId('') })
      .catch(() => {})
  }, [classId])

  const loadHistory = useCallback(async () => {
    if (!learnerId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/attendance/learner/${learnerId}/history?year=${year}&month=${month}`)
      setHistory(data)
    } catch { setHistory([]) }
    finally { setLoading(false) }
  }, [learnerId, year, month])

  useEffect(() => { loadHistory() }, [loadHistory])

  function shiftMonth(d) {
    let m = month + d, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1)  { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const counts = STATUS.map(s => ({ ...s, count: history.filter(h => h.status === s.key).length }))
  const total = history.length
  const attended = history.filter(h => h.status === 'present' || h.status === 'late').length
  const pct = total ? Math.round((attended / total) * 100) : null

  if (!classId) return <Empty msg="Select a class above" />

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={lbl}>Learner</label>
          <select style={sel} value={learnerId} onChange={e => setLearnerId(e.target.value)}>
            <option value="">Select learner…</option>
            {learners.map(l => <option key={l.id} value={l.id}>{l.last_name}, {l.first_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => shiftMonth(-1)} style={navBtn}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', minWidth: 130, textAlign: 'center' }}>{monthName(year, month)}</span>
          <button onClick={() => shiftMonth(1)} style={navBtn}>›</button>
        </div>
      </div>

      {learnerId && (
        <>
          {/* Totals */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {counts.map(s => (
              <div key={s.key} style={{ flex: '1 1 80px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase' }}>{s.full}</div>
              </div>
            ))}
            {pct !== null && (
              <div style={{ flex: '1 1 80px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: pct >= 90 ? '#16a34a' : '#b8870a' }}>{pct}%</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Attendance</div>
              </div>
            )}
          </div>

          {/* History list */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
            ) : history.length === 0 ? (
              <Empty msg="No attendance records for this period" />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ ...th, textAlign: 'left' }}>Date</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'left' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const s = STATUS_MAP[h.status]
                    return (
                      <tr key={h.date} style={{ borderBottom: i < history.length - 1 ? '1px solid #f7f7f7' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 500, color: '#374151' }}>{fmtDate(h.date)}</td>
                        <td style={{ ...td }}>
                          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontWeight: 700, fontSize: 13 }}>
                            {s.full}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'left', color: '#6b7280', fontSize: 13 }}>{h.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!learnerId && <Empty msg="Select a learner to view their history" />}
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────
function Empty({ msg }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      <div style={{ fontWeight: 600 }}>{msg}</div>
    </div>
  )
}

const lbl   = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }
const sel   = { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', minWidth: 200, background: '#fff' }
const th    = { padding: '11px 14px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }
const td    = { padding: '10px 14px', fontSize: 14, textAlign: 'center' }
const navBtn = { padding: '6px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: '#374151' }
