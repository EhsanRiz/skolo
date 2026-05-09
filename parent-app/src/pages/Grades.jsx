import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, { errMessage } from '../lib/api'

const TERMS = [1, 2, 3, 4]

export default function Grades() {
  const { school } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [expanded, setExpanded] = useState({})
  const [activeTerm, setActiveTerm] = useState({})
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { loadGrades() }, [year])

  async function loadGrades() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/parent-data/grades?year=${year}`)
      setData(d)
      // Default to latest term with data for each child
      const defaults = {}
      for (const l of (d.learners || [])) {
        const terms = Object.keys(l.terms || {}).map(Number).sort((a, b) => b - a)
        defaults[l.id] = terms[0] || 1
      }
      setActiveTerm(defaults)
    } catch {}
    setLoading(false)
  }

  function toggle(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }

  function getGrade(mark, boundaries) {
    if (!mark && mark !== 0) return '—'
    if (boundaries && Array.isArray(boundaries) && boundaries.length > 0) {
      for (const b of boundaries) { if (mark >= b.min) return b.grade }
      return 'F'
    }
    if (mark >= 80) return 'A'; if (mark >= 70) return 'B'; if (mark >= 60) return 'C'; if (mark >= 50) return 'D'; return 'F'
  }

  function gradeColor(grade) {
    if (grade === 'A') return '#15803d'
    if (grade === 'B') return '#003049'
    if (grade === 'C') return '#b8870a'
    if (grade === 'D') return '#c2410c'
    return '#b8870a'
  }

  async function downloadReport(learnerId, term) {
    setDownloading(`${learnerId}-${term}`)
    try {
      const response = await api.get(`/parent-data/report-card/${learnerId}?term=${term}&year=${year}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err) { alert(errMessage(err, 'Report card not available')) }
    setDownloading(null)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading grades...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Grades</h1>
        <select value={year} onChange={e => setYear(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151'
        }}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {(data?.learners || []).map(child => {
        const isOpen = expanded[child.id]
        const term = activeTerm[child.id] || 1
        const termData = child.terms?.[term]
        const hasAnyData = Object.keys(child.terms || {}).length > 0

        return (
          <div key={child.id} style={cardStyle}>
            <div onClick={() => toggle(child.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>
                    {child.first_name} {child.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {child.classes?.grades?.name} {child.classes?.name}
                  </div>
                </div>
                {hasAnyData ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#003049' }}>
                      {Object.keys(child.terms).length} term{Object.keys(child.terms).length > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>results available</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>No results</div>
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, color: '#9ca3af', fontSize: 11 }}>
                {isOpen ? 'Tap to collapse' : 'Tap to view'}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                {/* Term tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {TERMS.map(t => (
                    <button key={t} onClick={() => setActiveTerm(prev => ({ ...prev, [child.id]: t }))}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: term === t ? '#003049' : '#f7f7f7',
                        color: term === t ? '#fff' : child.terms?.[t] ? '#1f2937' : '#d1d5db'
                      }}>
                      T{t}
                    </button>
                  ))}
                </div>

                {termData ? (
                  <>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#6b7280', fontSize: 11, textAlign: 'left' }}>
                          <th style={{ padding: '6px 0', fontWeight: 500 }}>Subject</th>
                          <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'center' }}>Mark</th>
                          <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'center' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termData.results.map(r => {
                          const grade = getGrade(r.mark, data.grade_boundaries)
                          return (
                            <tr key={r.id} style={{ borderTop: '1px solid #f7f7f7' }}>
                              <td style={{ padding: '8px 0', color: '#1f2937' }}>{r.subject}</td>
                              <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>{r.mark != null ? `${r.mark}%` : '—'}</td>
                              <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                <span style={{ fontWeight: 700, color: gradeColor(grade) }}>{grade}</span>
                              </td>
                            </tr>
                          )
                        })}
                        {/* Average row */}
                        {termData.average != null && (
                          <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                            <td style={{ padding: '8px 0', fontWeight: 700, color: '#1f2937' }}>Average</td>
                            <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 700, color: '#003049' }}>{termData.average}%</td>
                            <td style={{ padding: '8px 0', textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, color: gradeColor(getGrade(termData.average, data.grade_boundaries)) }}>
                                {getGrade(termData.average, data.grade_boundaries)}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Download report card */}
                    <button onClick={() => downloadReport(child.id, term)}
                      disabled={downloading === `${child.id}-${term}`}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #003049',
                        background: '#e6eff5', color: '#003049', fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', marginTop: 14, opacity: downloading === `${child.id}-${term}` ? 0.5 : 1
                      }}>
                      {downloading === `${child.id}-${term}` ? 'Generating...' : 'Download Report Card'}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>
                    No results for Term {term}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {(!data?.learners || data.learners.length === 0) && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
          No learners linked to your account
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e5e7eb', marginBottom: 12
}
