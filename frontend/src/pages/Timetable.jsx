import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { t } from '../components/ui'
import api from '../lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// ── Color palette for teacher cards ──────────────────────────
const PALETTE = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  { bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  { bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d' },
  { bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488' },
  { bg: '#fefce8', border: '#fde68a', text: '#a16207' },
  { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' },
  { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
]

function getTeacherColor(teacherId, colorMap) {
  if (!teacherId) return PALETTE[0]
  if (!colorMap.current[teacherId]) {
    const idx = Object.keys(colorMap.current).length % PALETTE.length
    colorMap.current[teacherId] = PALETTE[idx]
  }
  return colorMap.current[teacherId]
}

// ── Assign Popup ─────────────────────────────────────────────
function AssignPopup({ open, onClose, onAssign, day, period, teachers, teacherClasses, busyTeacherIds, existingSlots }) {
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedTc, setSelectedTc] = useState('')
  const popRef = useRef()

  useEffect(() => {
    if (open) { setSelectedTeacher(''); setSelectedTc('') }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (popRef.current && !popRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!open) return null

  // Filter out busy teachers
  const availableTeachers = teachers.filter(t => !busyTeacherIds.includes(t.id))
  const busyTeachers = teachers.filter(t => busyTeacherIds.includes(t.id))

  // When teacher is selected, show their class assignments
  const teacherTcs = selectedTeacher
    ? teacherClasses.filter(tc => tc.teachers?.id === selectedTeacher)
    : []

  return (
    <div style={t.overlay} onClick={onClose}>
      <div ref={popRef} style={{ ...t.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Assign Slot</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {DAYS[day - 1]} · {period.label} ({period.start}–{period.end})
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Step 1: Pick teacher */}
        <div style={t.label}>Teacher</div>
        <select
          value={selectedTeacher}
          onChange={e => { setSelectedTeacher(e.target.value); setSelectedTc('') }}
          style={{ ...t.input, marginBottom: 8 }}
        >
          <option value="">Select a teacher…</option>
          {availableTeachers.length > 0 && (
            <optgroup label="Available">
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.reference_no})</option>
              ))}
            </optgroup>
          )}
          {busyTeachers.length > 0 && (
            <optgroup label="⛔ Busy at this time">
              {busyTeachers.map(t => (
                <option key={t.id} value={t.id} disabled style={{ color: '#94a3b8' }}>
                  {t.full_name} — already teaching
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {selectedTeacher && teacherTcs.length === 0 && (
          <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#a16207', marginBottom: 14 }}>
            This teacher has no class assignments yet. Go to Settings → Teachers to assign classes first.
          </div>
        )}

        {/* Step 2: Pick subject/class combo */}
        {selectedTeacher && teacherTcs.length > 0 && (
          <>
            <div style={t.label}>Subject & Class</div>
            <select
              value={selectedTc}
              onChange={e => setSelectedTc(e.target.value)}
              style={t.input}
            >
              <option value="">Select subject…</option>
              {teacherTcs.map(tc => (
                <option key={tc.id} value={tc.id}>
                  {tc.subject || 'General'} — {tc.classes?.grades?.name} {tc.classes?.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Already assigned to this slot */}
        {existingSlots.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Currently assigned
            </div>
            {existingSlots.map(s => (
              <div key={s.id} style={{ fontSize: 13, color: '#64748b', padding: '4px 0' }}>
                {s.teacher_classes?.teachers?.full_name} — {s.teacher_classes?.subject || 'General'}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={t.btn.ghost}>Cancel</button>
          <button
            onClick={() => { if (selectedTc) onAssign(selectedTc) }}
            disabled={!selectedTc}
            style={{
              ...t.btn.primary,
              opacity: selectedTc ? 1 : 0.4,
              cursor: selectedTc ? 'pointer' : 'not-allowed'
            }}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Timetable Page ──────────────────────────────────────
export default function Timetable() {
  const { school, user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const colorMap = useRef({})

  // State
  const [view, setView] = useState(isTeacher ? 'my' : 'class') // 'class' | 'my'
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [slots, setSlots] = useState([])
  const [allSlots, setAllSlots] = useState([]) // all school slots for conflict checking
  const [teachers, setTeachers] = useState([])
  const [teacherClasses, setTeacherClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mySlots, setMySlots] = useState([])
  const [myTeacher, setMyTeacher] = useState(null)

  // Popup state
  const [popup, setPopup] = useState({ open: false, day: null, period: null })
  const [busyTeacherIds, setBusyTeacherIds] = useState([])

  const periods = school?.periods || []
  const teachablePeriods = periods.filter(p => !p.isBreak)

  // ── Load initial data ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const promises = [
          api.get('/grades'),
          api.get('/timetable'),
        ]
        if (isAdmin) {
          promises.push(api.get('/teachers'))
          promises.push(api.get('/teacher-classes'))
        }
        if (isTeacher) {
          promises.push(api.get('/timetable/my'))
        }

        const results = await Promise.all(promises)
        const gradesData = results[0].data || []
        const allSlotsData = results[1].data || []
        setAllSlots(allSlotsData)

        // Flatten grades → classes
        const allClasses = []
        gradesData.forEach(g => {
          (g.classes || []).forEach(c => {
            allClasses.push({ id: c.id, name: c.name, grade_name: g.name, grade_id: g.id })
          })
        })
        setClasses(allClasses)

        if (isAdmin) {
          setTeachers(results[2].data || [])
          setTeacherClasses(results[3].data || [])
        }

        if (isTeacher) {
          const myData = results[2].data
          setMyTeacher(myData.teacher)
          setMySlots(myData.slots || [])
        }

        // Auto-select first class
        if (allClasses.length > 0 && !isTeacher) {
          setSelectedClass(allClasses[0].id)
        }
      } catch (err) {
        toast.error('Failed to load timetable data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Load slots for selected class ─────────────────────────────
  useEffect(() => {
    if (!selectedClass || view !== 'class') return
    async function loadClassSlots() {
      try {
        const { data } = await api.get(`/timetable/by-class/${selectedClass}`)
        setSlots(data || [])
      } catch { /* slots stay empty */ }
    }
    loadClassSlots()
  }, [selectedClass, view])

  // ── Open assign popup ────────────────────────────────────────
  async function openAssignPopup(day, period) {
    if (!isAdmin) return
    // Fetch conflicts for this day+period
    try {
      const { data } = await api.get(`/timetable/conflicts/${day}/${period.number}`)
      setBusyTeacherIds(data.busy_teacher_ids || [])
    } catch {
      setBusyTeacherIds([])
    }

    // Find what's already in this slot for this class
    const existing = slots.filter(s =>
      s.day_of_week === day && s.period_number === period.number
    )

    setPopup({ open: true, day, period, existingSlots: existing })
  }

  // ── Assign slot ──────────────────────────────────────────────
  async function handleAssign(tcId) {
    try {
      const { data } = await api.post('/timetable', {
        teacher_class_id: tcId,
        day_of_week: popup.day,
        period_number: popup.period.number
      })
      setSlots(prev => [...prev, data])
      setAllSlots(prev => [...prev, data])
      toast.success('Slot assigned')
      setPopup({ open: false })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign slot')
    }
  }

  // ── Remove slot ──────────────────────────────────────────────
  async function removeSlot(slotId) {
    try {
      await api.delete(`/timetable/${slotId}`)
      setSlots(prev => prev.filter(s => s.id !== slotId))
      setAllSlots(prev => prev.filter(s => s.id !== slotId))
    } catch { toast.error('Failed to remove') }
  }

  // ── Build slot lookup ────────────────────────────────────────
  function buildSlotMap(slotsArray) {
    const map = {}
    slotsArray.forEach(s => {
      const key = `${s.day_of_week}-${s.period_number}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }

  const slotMap = buildSlotMap(view === 'my' ? mySlots : slots)

  // ── Stats ────────────────────────────────────────────────────
  const currentSlots = view === 'my' ? mySlots : slots
  const totalTeachable = teachablePeriods.length * 5
  const filledSlots = currentSlots.length
  const fillRate = totalTeachable > 0 ? Math.round((filledSlots / totalTeachable) * 100) : 0

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#64748b' }}>
        Loading timetable…
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ ...t.card, padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>No periods defined yet</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
            Before building a timetable, you need to set up your school's period structure — how many periods per day, start and end times, and breaks.
          </div>
          {isAdmin && (
            <a href="/settings" style={{
              display: 'inline-block', padding: '10px 24px', background: '#0f2044', color: '#fff',
              borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none'
            }}>
              Go to Settings → Timetable
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Timetable</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {isAdmin ? 'Click any empty slot to assign a teacher and subject.' : 'Your weekly teaching schedule.'}
          </p>
        </div>

        {/* View toggle for teachers with admin view */}
        {(isAdmin || isTeacher) && (
          <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {isAdmin && (
              <button onClick={() => setView('class')} style={{
                padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: 'all .15s',
                background: view === 'class' ? '#fff' : 'transparent',
                color: view === 'class' ? '#0f2044' : '#64748b',
                boxShadow: view === 'class' ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
              }}>
                By Class
              </button>
            )}
            <button onClick={() => setView('my')} style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, transition: 'all .15s',
              background: view === 'my' ? '#fff' : 'transparent',
              color: view === 'my' ? '#0f2044' : '#64748b',
              boxShadow: view === 'my' ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
            }}>
              {isTeacher ? 'My Timetable' : 'Teacher View'}
            </button>
          </div>
        )}
      </div>

      {/* ── Class selector (class view) ── */}
      {view === 'class' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1.5px solid',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                  background: selectedClass === c.id ? '#0f2044' : '#fff',
                  color: selectedClass === c.id ? '#fff' : '#374151',
                  borderColor: selectedClass === c.id ? '#0f2044' : '#e2e8f0'
                }}
              >
                {c.grade_name} {c.name}
              </button>
            ))}
          </div>

          {/* Fill rate */}
          {selectedClass && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 80, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden'
              }}>
                <div style={{
                  width: `${fillRate}%`, height: '100%', borderRadius: 3,
                  background: fillRate === 100 ? '#16a34a' : fillRate > 50 ? '#2563eb' : '#f59e0b',
                  transition: 'width .3s'
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{fillRate}% filled</span>
            </div>
          )}
        </div>
      )}

      {/* ── My Timetable header ── */}
      {view === 'my' && myTeacher && (
        <div style={{ ...t.card, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: '#1e40af'
          }}>
            {myTeacher.full_name?.charAt(0) || 'T'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{myTeacher.full_name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{filledSlots} periods this week</div>
          </div>
        </div>
      )}

      {/* ── Weekly Grid ── */}
      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>
        <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{
                padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left',
                width: 120, borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #f1f5f9',
                position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2
              }}>
                Period
              </th>
              {DAYS.map((d, i) => (
                <th key={d} style={{
                  padding: '12px 8px', fontSize: 11, fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center',
                  borderBottom: '1px solid #e2e8f0',
                  borderRight: i < 4 ? '1px solid #f1f5f9' : 'none'
                }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p, pi) => {
              if (p.isBreak) {
                return (
                  <tr key={pi} style={{ background: '#fefce8' }}>
                    <td colSpan={6} style={{
                      padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#a16207',
                      textAlign: 'center', borderBottom: '1px solid #f1f5f9'
                    }}>
                      ☕ {p.label} ({p.start}–{p.end})
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={pi} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Period label */}
                  <td style={{
                    padding: '10px 14px', borderRight: '1px solid #f1f5f9',
                    verticalAlign: 'top', position: 'sticky', left: 0,
                    background: '#fff', zIndex: 1
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.start}–{p.end}</div>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((d, dayIdx) => {
                    const dayNum = dayIdx + 1
                    const key = `${dayNum}-${p.number}`
                    const cellSlots = slotMap[key] || []
                    const isEmpty = cellSlots.length === 0

                    return (
                      <td
                        key={d}
                        onClick={() => isEmpty && isAdmin && view === 'class' && openAssignPopup(dayNum, p)}
                        style={{
                          padding: '6px 5px', verticalAlign: 'top',
                          borderRight: dayIdx < 4 ? '1px solid #f1f5f9' : 'none',
                          minWidth: 140, minHeight: 60,
                          cursor: isEmpty && isAdmin && view === 'class' ? 'pointer' : 'default',
                          background: isEmpty && isAdmin && view === 'class' ? '#fafbfc' : '#fff',
                          transition: 'background .1s'
                        }}
                        onMouseEnter={e => {
                          if (isEmpty && isAdmin && view === 'class') e.currentTarget.style.background = '#f0f7ff'
                        }}
                        onMouseLeave={e => {
                          if (isEmpty && isAdmin && view === 'class') e.currentTarget.style.background = '#fafbfc'
                        }}
                      >
                        {cellSlots.map(s => {
                          const tc = s.teacher_classes
                          const teacherId = tc?.teachers?.id
                          const color = getTeacherColor(teacherId, colorMap)
                          return (
                            <div key={s.id} style={{
                              background: color.bg, border: `1.5px solid ${color.border}`,
                              borderRadius: 10, padding: '7px 10px', marginBottom: 4,
                              position: 'relative', transition: 'transform .1s',
                            }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: color.text }}>
                                {tc?.subject || 'General'}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                {tc?.teachers?.full_name || '—'}
                              </div>
                              {view === 'class' && (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                                  {tc?.classes?.grades?.name} {tc?.classes?.name}
                                </div>
                              )}
                              {view === 'my' && (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                                  {tc?.classes?.grades?.name} {tc?.classes?.name}
                                </div>
                              )}
                              {s.room && <div style={{ fontSize: 10, color: '#94a3b8' }}>📍 {s.room}</div>}

                              {/* Remove button — admin only */}
                              {isAdmin && view === 'class' && (
                                <button
                                  onClick={e => { e.stopPropagation(); removeSlot(s.id) }}
                                  style={{
                                    position: 'absolute', top: 3, right: 5,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#94a3b8', fontSize: 13, padding: 2,
                                    borderRadius: 4, lineHeight: 1
                                  }}
                                  title="Remove"
                                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )
                        })}

                        {/* Empty slot indicator for admin */}
                        {isEmpty && isAdmin && view === 'class' && (
                          <div style={{
                            border: '1.5px dashed #e2e8f0', borderRadius: 10,
                            padding: '14px 8px', textAlign: 'center', color: '#cbd5e1',
                            fontSize: 18, fontWeight: 300, minHeight: 48,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            +
                          </div>
                        )}

                        {/* Empty slot for teacher view */}
                        {isEmpty && view === 'my' && (
                          <div style={{
                            borderRadius: 10, padding: '14px 8px', textAlign: 'center',
                            color: '#e2e8f0', fontSize: 12, minHeight: 48,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            —
                          </div>
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

      {/* ── Legend / tips ── */}
      {isAdmin && view === 'class' && (
        <div style={{
          marginTop: 16, padding: '12px 16px', background: '#f0fdf4',
          border: '1px solid #86efac', borderRadius: 10, fontSize: 13,
          color: '#15803d', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ fontSize: 16 }}>💡</span>
          Click any empty slot (+) to assign a teacher. The system will automatically block teachers who are already teaching another class at that time.
        </div>
      )}

      {/* ── No class selected message ── */}
      {view === 'class' && !selectedClass && classes.length > 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          Select a class above to view its timetable.
        </div>
      )}

      {view === 'class' && classes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          No classes set up yet. Go to Settings → Grades & Classes to create your grade structure.
        </div>
      )}

      {/* ── Assign Popup ── */}
      <AssignPopup
        open={popup.open}
        onClose={() => setPopup({ open: false })}
        onAssign={handleAssign}
        day={popup.day}
        period={popup.period || {}}
        teachers={teachers}
        teacherClasses={teacherClasses}
        busyTeacherIds={busyTeacherIds}
        existingSlots={popup.existingSlots || []}
      />
    </div>
  )
}
