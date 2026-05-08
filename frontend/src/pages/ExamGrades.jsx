import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

const TERMS = [1, 2, 3, 4]
const CUR_YEAR = new Date().getFullYear()
const YEARS = [CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1]

const DEFAULT_BOUNDARIES = [
  { grade: 'A', min: 80 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 50 },
  { grade: 'F', min: 0  },
]

const GRADE_COLORS = ['#16a34a','#003049','#d97706','#b8870a','#dc2626','#7c3aed','#0891b2','#be185d']

function letterGrade(mark, boundaries) {
  if (mark === null || mark === undefined || mark === '') return '—'
  const n = Number(mark)
  const scale = (boundaries && boundaries.length ? boundaries : DEFAULT_BOUNDARIES)
    .slice().sort((a, b) => b.min - a.min)
  for (const b of scale) {
    if (n >= b.min) return b.grade
  }
  return scale[scale.length - 1]?.grade || '—'
}

function gradeColor(grade, boundaries) {
  const scale = (boundaries && boundaries.length ? boundaries : DEFAULT_BOUNDARIES)
    .slice().sort((a, b) => b.min - a.min)
  const idx = scale.findIndex(b => b.grade === grade)
  if (idx === -1) return '#9ca3af'
  return GRADE_COLORS[idx % GRADE_COLORS.length]
}

export default function ExamGrades() {
  const { user, school } = useAuth()
  const { showToast } = useToast()
  const boundaries  = school?.grade_boundaries?.length ? school.grade_boundaries : DEFAULT_BOUNDARIES
  const isTeacher   = user?.role === 'teacher'
  const isPrincipal = user?.role === 'principal'
  const readOnly    = isPrincipal

  // Selection state
  const [classes,     setClasses]     = useState([])        // available classes / assignments
  const [selected,    setSelected]    = useState(null)      // { class_id, class_name, grade_name, subject? }
  const [subject,     setSubject]     = useState('')
  const [term,        setTerm]        = useState(1)
  const [year,        setYear]        = useState(CUR_YEAR)
  const [subjects,    setSubjects]    = useState([])        // autocomplete

  // Grid state
  const [learners,    setLearners]    = useState([])
  const [marks,       setMarks]       = useState({})        // { learner_id: mark }
  const [dirty,       setDirty]       = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Load classes on mount
  useEffect(() => {
    api.get('/exam-grades/classes').then(r => {
      setClasses(r.data)
      if (r.data.length === 1) autoSelect(r.data[0])
    }).catch(() => {})

    api.get('/exam-grades/subjects').then(r => setSubjects(r.data)).catch(() => {})
  }, [])

  function autoSelect(cls) {
    if (isTeacher) {
      // teacher_classes row: has .classes sub-object and optional .subject
      setSelected({
        class_id:   cls.classes.id,
        class_name: cls.classes.name,
        grade_name: cls.classes.grades?.name || '',
        subject:    cls.subject || ''
      })
      setSubject(cls.subject || '')
    } else {
      setSelected({
        class_id:   cls.id,
        class_name: cls.name,
        grade_name: cls.grades?.name || ''
      })
    }
  }

  function handleClassChange(e) {
    const val = e.target.value
    if (!val) { setSelected(null); setLearners([]); setMarks({}); return }
    const cls = classes.find(c => (isTeacher ? c.classes.id : c.id) === val)
    if (cls) autoSelect(cls)
  }

  // Load learners + marks whenever selection is complete
  const loadGrid = useCallback(async () => {
    if (!selected || !subject.trim() || !term || !year) return
    setLoadingGrid(true)
    setDirty(false)
    try {
      const { data } = await api.get(
        `/exam-grades/class/${selected.class_id}/results?subject=${encodeURIComponent(subject.trim())}&term=${term}&year=${year}`
      )
      setLearners(data)
      const m = {}
      data.forEach(l => { m[l.id] = l.mark !== null ? String(l.mark) : '' })
      setMarks(m)
    } catch { showToast('Failed to load learners', 'error') }
    finally { setLoadingGrid(false) }
  }, [selected, subject, term, year])

  useEffect(() => { loadGrid() }, [loadGrid])

  function handleMark(learnerId, val) {
    if (readOnly) return
    // Allow empty, or 0-100
    if (val !== '' && (isNaN(val) || Number(val) < 0 || Number(val) > 100)) return
    setMarks(m => ({ ...m, [learnerId]: val }))
    setDirty(true)
  }

  async function handleSave() {
    if (!selected || !subject.trim()) return
    setSaving(true)
    try {
      const results = learners.map(l => ({
        learner_id: l.id,
        mark: marks[l.id] !== '' && marks[l.id] !== undefined ? Number(marks[l.id]) : null
      }))
      await api.post('/exam-grades/bulk', { subject: subject.trim(), term, year, results })
      setDirty(false)
      showToast(`Grades saved — ${results.length} learners`, 'success')
    } catch { showToast('Failed to save grades', 'error') }
    finally { setSaving(false) }
  }

  const filledCount = learners.filter(l => marks[l.id] !== '' && marks[l.id] !== undefined && marks[l.id] !== null).length
  const avg = learners.length
    ? (learners.reduce((s, l) => s + (marks[l.id] !== '' && marks[l.id] !== undefined ? Number(marks[l.id]) : 0), 0) / (filledCount || 1)).toFixed(1)
    : null

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937' }}>Exam Grades</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
          {readOnly ? 'View grades by class, subject and term' : 'Enter marks per subject, term and year'}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

        {/* Class selector */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={lbl}>Class</label>
          <select style={sel} value={selected ? (isTeacher ? selected.class_id : selected.class_id) : ''} onChange={handleClassChange}>
            <option value="">Select class…</option>
            {classes.map(c => {
              const id   = isTeacher ? c.classes.id   : c.id
              const name = isTeacher ? `${c.classes.grades?.name || ''} ${c.classes.name}${c.subject ? ' — ' + c.subject : ''}` : `${c.grades?.name || ''} ${c.name}`
              return <option key={id} value={id}>{name}</option>
            })}
          </select>
        </div>

        {/* Subject */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={lbl}>Subject</label>
          <input
            style={sel}
            list="subject-list"
            value={subject}
            onChange={e => { setSubject(e.target.value); setDirty(false) }}
            placeholder="e.g. Mathematics"
            disabled={isTeacher && !!selected?.subject}
          />
          <datalist id="subject-list">
            {subjects.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Term */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={lbl}>Term</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {TERMS.map(t => (
              <button key={t} onClick={() => setTerm(t)} style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid',
                borderColor: term === t ? '#003049' : '#e5e7eb',
                background: term === t ? '#003049' : '#fff',
                color: term === t ? '#fff' : '#374151',
                fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}>T{t}</button>
            ))}
          </div>
        </div>

        {/* Year */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={lbl}>Year</label>
          <select style={{ ...sel, width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Save */}
        {!readOnly && (
          <button onClick={handleSave} disabled={saving || !selected || !subject.trim() || !learners.length}
            style={{ padding: '9px 22px', background: dirty ? '#003049' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: saving || !dirty ? 'not-allowed' : 'pointer', alignSelf: 'flex-end', whiteSpace: 'nowrap', transition: 'background .2s' }}>
            {saving ? 'Saving…' : dirty ? '💾 Save grades' : 'Saved ✓'}
          </button>
        )}
      </div>

      {/* Stats bar */}
      {learners.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Learners', val: learners.length },
            { label: 'Marked', val: filledCount },
            { label: 'Unmarked', val: learners.length - filledCount },
            { label: 'Class avg', val: filledCount ? `${avg}%` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 18px', flex: '1 1 100px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loadingGrid ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading learners…</div>
        ) : !selected ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600 }}>Select a class to get started</div>
          </div>
        ) : !subject.trim() ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div style={{ fontWeight: 600 }}>Enter a subject name above</div>
          </div>
        ) : learners.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontWeight: 600 }}>No active learners in this class</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>Learner</th>
                <th style={th}>Ref</th>
                <th style={th}>Mark /100</th>
                <th style={th}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l, i) => {
                const mark = marks[l.id]
                const grade = letterGrade(mark !== '' ? mark : null, boundaries)
                const isF = boundaries.length
                  ? grade === [...boundaries].sort((a,b) => a.min - b.min)[0]?.grade
                  : grade === 'F'
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f7f7f7', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...td, color: '#9ca3af', width: 40 }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1f2937' }}>{l.last_name}, {l.first_name}</td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: 12 }}>{l.reference_no || '—'}</td>
                    <td style={{ ...td, width: 120 }}>
                      {readOnly ? (
                        <span style={{ fontWeight: 700, color: '#1f2937' }}>{mark !== '' && mark !== null && mark !== undefined ? `${mark}%` : '—'}</span>
                      ) : (
                        <input
                          type="number"
                          min={0} max={100}
                          value={mark ?? ''}
                          onChange={e => handleMark(l.id, e.target.value)}
                          placeholder="—"
                          style={{
                            width: 70, padding: '5px 8px', borderRadius: 7,
                            border: `1.5px solid ${isF && mark !== '' && mark !== undefined ? '#fca5a5' : '#e5e7eb'}`,
                            fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none',
                            background: isF && mark !== '' && mark !== undefined ? '#fff5f5' : '#fff'
                          }}
                        />
                      )}
                    </td>
                    <td style={{ ...td, width: 60 }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        background: gradeColor(grade, boundaries) + '18',
                        color: gradeColor(grade, boundaries),
                        fontWeight: 700, fontSize: 13
                      }}>{grade}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom save bar — sticky when dirty */}
      {dirty && !readOnly && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#003049', color: '#fff', padding: '12px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>You have unsaved changes</span>
          <button onClick={handleSave} disabled={saving} style={{ background: '#fff', color: '#003049', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save now'}
          </button>
        </div>
      )}
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }
const sel = { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', width: '100%', background: '#fff', boxSizing: 'border-box' }
const th  = { padding: '11px 14px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }
const td  = { padding: '10px 14px', fontSize: 14, textAlign: 'center' }
