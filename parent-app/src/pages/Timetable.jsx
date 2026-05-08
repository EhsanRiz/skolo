import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const COLORS = ['#f0f5fa', '#f0fdf4', '#fef4d6', '#fce7f3', '#ede9fe', '#fff7ed', '#ecfdf5', '#fef2f2']

function hashColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Timetable() {
  const { children: learners } = useAuth()
  const [selectedChild, setSelectedChild] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (learners?.length > 0 && !selectedChild) {
      setSelectedChild(learners[0].id)
    }
  }, [learners])

  useEffect(() => {
    if (selectedChild) loadTimetable()
  }, [selectedChild])

  async function loadTimetable() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/parent-data/timetable/${selectedChild}`)
      setData(d)
    } catch {}
    setLoading(false)
  }

  // Build grid: periods (rows) × days (columns)
  function buildGrid() {
    if (!data?.slots?.length) return null

    const maxPeriod = Math.max(...data.slots.map(s => s.period_number), 0)
    const periods = data.periods?.length > 0
      ? data.periods.sort((a, b) => a.number - b.number)
      : Array.from({ length: maxPeriod }, (_, i) => ({ number: i + 1, label: `Period ${i + 1}` }))

    // Create lookup: day_of_week-period_number → slot
    const lookup = {}
    for (const s of data.slots) {
      lookup[`${s.day_of_week}-${s.period_number}`] = s
    }

    return { periods, lookup }
  }

  const grid = data ? buildGrid() : null

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading timetable...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Timetable</h1>
        {learners?.length > 1 && (
          <select value={selectedChild || ''} onChange={e => setSelectedChild(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151'
          }}>
            {learners.map(l => (
              <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
            ))}
          </select>
        )}
      </div>

      {data?.learner && (
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          {data.learner.first_name} {data.learner.last_name} — {data.learner.classes?.grades?.name} {data.learner.classes?.name}
        </div>
      )}

      {!grid || !data?.slots?.length ? (
        <div style={{
          textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>&#128197;</div>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>No timetable available</div>
          <div style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>The school hasn't set up a timetable yet</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                {DAYS.map((d, i) => (
                  <th key={i} style={{ ...thStyle, textAlign: 'center', color: '#1f2937', fontWeight: 700 }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.periods.map(period => (
                <tr key={period.number}>
                  <td style={{
                    padding: '6px 10px', fontSize: 11, color: '#6b7280', fontWeight: 600,
                    borderBottom: '1px solid #f7f7f7', whiteSpace: 'nowrap', verticalAlign: 'top'
                  }}>
                    <div>{period.label || `P${period.number}`}</div>
                    {period.start && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{period.start}</div>}
                  </td>
                  {[1, 2, 3, 4, 5].map(day => {
                    const slot = grid.lookup[`${day}-${period.number}`]
                    return (
                      <td key={day} style={{
                        padding: 4, borderBottom: '1px solid #f7f7f7', borderLeft: '1px solid #f7f7f7',
                        verticalAlign: 'top', minWidth: 80
                      }}>
                        {slot ? (
                          <div style={{
                            background: hashColor(slot.subject || ''), borderRadius: 6,
                            padding: '6px 8px', minHeight: 40
                          }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: '#1f2937', lineHeight: 1.3 }}>
                              {slot.subject}
                            </div>
                            {slot.teacher && (
                              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{slot.teacher}</div>
                            )}
                            {slot.room && (
                              <div style={{ fontSize: 10, color: '#9ca3af' }}>{slot.room}</div>
                            )}
                          </div>
                        ) : (
                          <div style={{ minHeight: 40 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '10px 8px', fontSize: 12, color: '#6b7280', fontWeight: 600,
  borderBottom: '2px solid #e5e7eb', background: '#fafafa'
}
