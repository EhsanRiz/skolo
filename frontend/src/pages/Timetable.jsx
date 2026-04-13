import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { t } from '../components/ui'
import api from '../lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// ── Color palette for teacher cards ──────────────────────────
const PALETTE = [
  { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', dragBg: '#dbeafe' },
  { bg: '#f0fdf4', border: '#86efac', text: '#166534', dragBg: '#dcfce7' },
  { bg: '#faf5ff', border: '#d8b4fe', text: '#7c3aed', dragBg: '#f3e8ff' },
  { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', dragBg: '#ffedd5' },
  { bg: '#fdf2f8', border: '#f9a8d4', text: '#be185d', dragBg: '#fce7f3' },
  { bg: '#f0fdfa', border: '#5eead4', text: '#0d9488', dragBg: '#ccfbf1' },
  { bg: '#fefce8', border: '#fde047', text: '#a16207', dragBg: '#fef9c3' },
  { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', dragBg: '#fee2e2' },
  { bg: '#f8fafc', border: '#94a3b8', text: '#475569', dragBg: '#e2e8f0' },
  { bg: '#ecfdf5', border: '#6ee7b7', text: '#059669', dragBg: '#d1fae5' },
]

function getColor(id, map) {
  if (!id) return PALETTE[0]
  if (!map.current[id]) {
    const idx = Object.keys(map.current).length % PALETTE.length
    map.current[id] = PALETTE[idx]
  }
  return map.current[id]
}

// ══════════════════════════════════════════════════════════════
// TEACHER SIDEBAR — draggable teacher-class cards
// ══════════════════════════════════════════════════════════════
function TeacherSidebar({ teacherClasses, colorMap, busyMap, dragTcId }) {
  // Group by teacher
  const grouped = {}
  teacherClasses.forEach(tc => {
    const tid = tc.teachers?.id
    if (!tid) return
    if (!grouped[tid]) grouped[tid] = { teacher: tc.teachers, items: [] }
    grouped[tid].items.push(tc)
  })

  const teachers = Object.values(grouped)

  if (teachers.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>👩‍🏫</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#64748b', marginBottom: 4 }}>No teachers assigned</div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
          Assign teachers to this class in Settings → Teachers first.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {teachers.map(({ teacher, items }) => (
        <div key={teacher.id} style={{ marginBottom: 14 }}>
          {/* Teacher name header */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 8px', marginBottom: 6 }}>
            {teacher.full_name}
          </div>
          {/* Draggable subject cards */}
          {items.map(tc => {
            const color = getColor(teacher.id, colorMap)
            const isBusy = busyMap[tc.id]
            const isDragging = dragTcId === tc.id

            return (
              <div
                key={tc.id}
                draggable={!isBusy}
                onDragStart={e => {
                  if (isBusy) { e.preventDefault(); return }
                  e.dataTransfer.setData('text/plain', tc.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                style={{
                  background: isDragging ? color.dragBg : isBusy ? '#f8fafc' : color.bg,
                  border: `1.5px solid ${isBusy ? '#e2e8f0' : color.border}`,
                  borderRadius: 10, padding: '8px 12px', marginBottom: 5,
                  cursor: isBusy ? 'not-allowed' : 'grab',
                  opacity: isBusy ? 0.45 : isDragging ? 0.6 : 1,
                  transition: 'all .15s', position: 'relative',
                  userSelect: 'none',
                }}
              >
                <div style={{
                  fontWeight: 700, fontSize: 13,
                  color: isBusy ? '#94a3b8' : color.text
                }}>
                  {tc.subject || 'General'}
                </div>
                <div style={{ fontSize: 11, color: isBusy ? '#cbd5e1' : '#64748b', marginTop: 1 }}>
                  {tc.classes?.grades?.name} {tc.classes?.name}
                </div>
                {isBusy && (
                  <div style={{
                    position: 'absolute', top: 6, right: 8,
                    fontSize: 9, fontWeight: 700, color: '#dc2626',
                    background: '#fee2e2', padding: '2px 6px', borderRadius: 4,
                    textTransform: 'uppercase', letterSpacing: '0.3px'
                  }}>
                    Busy
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DROPPABLE CELL — a single slot in the grid
// ══════════════════════════════════════════════════════════════
function DroppableCell({ day, period, cellSlots, isAdmin, viewMode, onDrop, onRemove, colorMap }) {
  const [dragOver, setDragOver] = useState(false)
  const isEmpty = cellSlots.length === 0

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOver) setDragOver(true)
  }

  function handleDragLeave() { setDragOver(false) }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const tcId = e.dataTransfer.getData('text/plain')
    if (tcId) onDrop(tcId)
  }

  return (
    <td
      onDragOver={isAdmin && viewMode === 'class' ? handleDragOver : undefined}
      onDragLeave={isAdmin && viewMode === 'class' ? handleDragLeave : undefined}
      onDrop={isAdmin && viewMode === 'class' ? handleDrop : undefined}
      style={{
        padding: '5px 4px', verticalAlign: 'top',
        borderRight: day < 5 ? '1px solid #f1f5f9' : 'none',
        minWidth: 130, minHeight: 56,
        background: dragOver ? '#dbeafe' : isEmpty && isAdmin && viewMode === 'class' ? '#fafbfc' : '#fff',
        transition: 'background .12s',
        outline: dragOver ? '2px dashed #3b82f6' : 'none',
        outlineOffset: -2, borderRadius: dragOver ? 6 : 0,
      }}
    >
      {cellSlots.map(s => {
        const tc = s.teacher_classes
        const teacherId = tc?.teachers?.id
        const color = getColor(teacherId, colorMap)
        return (
          <div key={s.id} style={{
            background: color.bg, border: `1.5px solid ${color.border}`,
            borderRadius: 10, padding: '6px 9px', marginBottom: 3,
            position: 'relative',
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: color.text }}>
              {tc?.subject || 'General'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {tc?.teachers?.full_name || '—'}
            </div>
            {viewMode === 'my' && (
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                {tc?.classes?.grades?.name} {tc?.classes?.name}
              </div>
            )}
            {s.room && <div style={{ fontSize: 10, color: '#94a3b8' }}>📍 {s.room}</div>}
            {isAdmin && viewMode === 'class' && (
              <button
                onClick={() => onRemove(s.id)}
                style={{
                  position: 'absolute', top: 3, right: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#cbd5e1', fontSize: 13, padding: 2,
                  borderRadius: 4, lineHeight: 1, transition: 'color .1s'
                }}
                title="Remove"
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}

      {/* Empty slot — drop target indicator */}
      {isEmpty && isAdmin && viewMode === 'class' && (
        <div style={{
          border: dragOver ? '2px solid #3b82f6' : '1.5px dashed #e2e8f0',
          borderRadius: 10, padding: '12px 8px', textAlign: 'center',
          color: dragOver ? '#3b82f6' : '#cbd5e1',
          fontSize: dragOver ? 12 : 20, fontWeight: dragOver ? 700 : 300,
          minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dragOver ? 'rgba(59,130,246,0.06)' : 'transparent',
          transition: 'all .15s',
        }}>
          {dragOver ? 'Drop here' : '+'}
        </div>
      )}

      {isEmpty && viewMode === 'my' && (
        <div style={{
          borderRadius: 10, padding: '12px 8px', textAlign: 'center',
          color: '#e2e8f0', fontSize: 12, minHeight: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          —
        </div>
      )}
    </td>
  )
}


// ══════════════════════════════════════════════════════════════
// MAIN TIMETABLE PAGE
// ══════════════════════════════════════════════════════════════
export default function Timetable() {
  const { school, user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const colorMap = useRef({})

  // State
  const [view, setView] = useState(isTeacher ? 'my' : 'class')
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [slots, setSlots] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [teachers, setTeachers] = useState([])
  const [allTeacherClasses, setAllTeacherClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [mySlots, setMySlots] = useState([])
  const [myTeacher, setMyTeacher] = useState(null)
  const [dragTcId, setDragTcId] = useState(null)

  // Busy map: which teacher_class IDs are busy per slot during drag
  // Key: `${day}-${period}` → Set of busy teacher IDs
  const [busyBySlot, setBusyBySlot] = useState({})

  const periods = school?.periods || []
  const teachablePeriods = periods.filter(p => !p.isBreak)

  // Teacher-classes for the selected class
  const classTcs = allTeacherClasses.filter(tc => tc.classes?.id === selectedClass)

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

        const allClasses = []
        gradesData.forEach(g => {
          (g.classes || []).forEach(c => {
            allClasses.push({ id: c.id, name: c.name, grade_name: g.name, grade_id: g.id })
          })
        })
        setClasses(allClasses)

        if (isAdmin) {
          setTeachers(results[2].data || [])
          setAllTeacherClasses(results[3].data || [])
        }

        if (isTeacher) {
          const myData = results[2].data
          setMyTeacher(myData.teacher)
          setMySlots(myData.slots || [])
        }

        if (allClasses.length > 0 && !isTeacher) {
          setSelectedClass(allClasses[0].id)
        }
      } catch {
        toast.error('Failed to load timetable data')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  // ── Load class slots + build busy map ─────────────────────────
  useEffect(() => {
    if (!selectedClass || view !== 'class') return
    async function loadClassSlots() {
      try {
        const { data } = await api.get(`/timetable/by-class/${selectedClass}`)
        setSlots(data || [])
      } catch { /* */ }
    }
    loadClassSlots()
  }, [selectedClass, view])

  // Build busy map from all school slots (for highlighting busy teachers in sidebar)
  // busyBySlot: { "1-3": [teacher_id_1, teacher_id_2] }
  useEffect(() => {
    const map = {}
    allSlots.forEach(s => {
      const tid = s.teacher_classes?.teachers?.id
      if (!tid) return
      const key = `${s.day_of_week}-${s.period_number}`
      if (!map[key]) map[key] = []
      if (!map[key].includes(tid)) map[key].push(tid)
    })
    setBusyBySlot(map)
  }, [allSlots])

  // Build per-tc busy map for the sidebar: is this teacher_class's teacher busy right now?
  // We track which cell is being hovered during drag via state
  const [hoverCell, setHoverCell] = useState(null) // { day, period }

  const busyTcMap = {}
  if (hoverCell) {
    const key = `${hoverCell.day}-${hoverCell.period}`
    const busyTeacherIds = busyBySlot[key] || []
    classTcs.forEach(tc => {
      if (busyTeacherIds.includes(tc.teachers?.id)) {
        busyTcMap[tc.id] = true
      }
    })
  }

  // ── Slot lookup ──────────────────────────────────────────────
  function buildSlotMap(arr) {
    const m = {}
    arr.forEach(s => {
      const k = `${s.day_of_week}-${s.period_number}`
      if (!m[k]) m[k] = []
      m[k].push(s)
    })
    return m
  }
  const slotMap = buildSlotMap(view === 'my' ? mySlots : slots)

  // ── Assign via drop ──────────────────────────────────────────
  async function handleDrop(day, periodNum, tcId) {
    try {
      const { data } = await api.post('/timetable', {
        teacher_class_id: tcId,
        day_of_week: day,
        period_number: periodNum
      })
      setSlots(prev => [...prev, data])
      setAllSlots(prev => [...prev, data])
      toast.success('Assigned!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign — teacher may be busy')
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

  // ── Stats ────────────────────────────────────────────────────
  const currentSlots = view === 'my' ? mySlots : slots
  const totalTeachable = teachablePeriods.length * 5
  const filledSlots = currentSlots.length
  const fillRate = totalTeachable > 0 ? Math.round((filledSlots / totalTeachable) * 100) : 0

  // ── Global drag tracking (for sidebar busy indicators) ───────
  useEffect(() => {
    function handleGlobalDragEnd() {
      setHoverCell(null)
      setDragTcId(null)
    }
    document.addEventListener('dragend', handleGlobalDragEnd)
    return () => document.removeEventListener('dragend', handleGlobalDragEnd)
  }, [])

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
            Set up your school's period structure first — periods, times, and breaks.
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Timetable</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {isAdmin ? 'Drag teachers from the sidebar onto the grid to build the schedule.' : 'Your weekly teaching schedule.'}
          </p>
        </div>

        {/* View toggle */}
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

      {/* ── Class selector pills ── */}
      {view === 'class' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
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

          {/* Fill rate */}
          {selectedClass && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${fillRate}%`, height: '100%', borderRadius: 3,
                  background: fillRate === 100 ? '#16a34a' : fillRate > 50 ? '#2563eb' : '#f59e0b',
                  transition: 'width .3s'
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{fillRate}%</span>
            </div>
          )}
        </div>
      )}

      {/* ── My Timetable header ── */}
      {view === 'my' && myTeacher && (
        <div style={{ ...t.card, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
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

      {/* ══ MAIN LAYOUT: Sidebar + Grid ══ */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Teacher Sidebar (admin + class view only) ── */}
        {isAdmin && view === 'class' && selectedClass && (
          <div style={{
            width: 220, flexShrink: 0, background: '#fff', borderRadius: 14,
            border: '1px solid #e2e8f0', overflow: 'hidden',
            position: 'sticky', top: 80,
            maxHeight: 'calc(100vh - 100px)', overflowY: 'auto'
          }}>
            <div style={{
              padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Teachers</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Drag onto the grid →
              </div>
            </div>
            <div style={{ padding: '10px 8px' }}>
              <TeacherSidebar
                teacherClasses={classTcs}
                colorMap={colorMap}
                busyMap={busyTcMap}
                dragTcId={dragTcId}
              />
            </div>
          </div>
        )}

        {/* ── Weekly Grid ── */}
        <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden' }}>
            <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{
                    padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left',
                    width: 110, borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #f1f5f9',
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
                      <td style={{
                        padding: '10px 14px', borderRight: '1px solid #f1f5f9',
                        verticalAlign: 'top', position: 'sticky', left: 0,
                        background: '#fff', zIndex: 1
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.start}–{p.end}</div>
                      </td>

                      {DAYS.map((d, dayIdx) => {
                        const dayNum = dayIdx + 1
                        const key = `${dayNum}-${p.number}`
                        const cellSlots = slotMap[key] || []

                        return (
                          <DroppableCell
                            key={d}
                            day={dayNum}
                            period={p}
                            cellSlots={cellSlots}
                            isAdmin={isAdmin}
                            viewMode={view}
                            colorMap={colorMap}
                            onDrop={(tcId) => handleDrop(dayNum, p.number, tcId)}
                            onRemove={removeSlot}
                          />
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Tips ── */}
          {isAdmin && view === 'class' && selectedClass && (
            <div style={{
              marginTop: 12, padding: '10px 14px', background: '#f0fdf4',
              border: '1px solid #86efac', borderRadius: 10, fontSize: 13,
              color: '#15803d', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 15 }}>💡</span>
              Drag a teacher card from the left panel onto an empty slot. If a teacher is already teaching at that time, the server will block it.
            </div>
          )}

          {view === 'class' && classes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              No classes set up yet. Go to Settings → Grades & Classes to create grades.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
