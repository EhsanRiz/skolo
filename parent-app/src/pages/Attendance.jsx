import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Attendance() {
  const { school } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => { loadAttendance() }, [year, month])

  async function loadAttendance() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/parent-data/attendance?year=${year}&month=${month}`)
      setData(d)
    } catch {}
    setLoading(false)
  }

  const statusColor = {
    present: { bg: '#dcfce7', color: '#16a34a', icon: '✓' },
    absent: { bg: '#fee2e2', color: '#dc2626', icon: '✗' },
    late: { bg: '#fef4d6', color: '#b8870a', icon: 'L' },
    excused: { bg: '#ede9fe', color: '#7c3aed', icon: 'E' }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading attendance...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' }}>Attendance</h1>

      {/* Month/year picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={selectStyle}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={selectStyle}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {(data?.learners || []).map(child => {
        const att = child.attendance
        const pct = att?.summary?.percentage || 0

        return (
          <div key={child.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>
                  {child.first_name} {child.last_name}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {child.classes?.grades?.name} {child.classes?.name}
                </div>
              </div>
              {/* Attendance percentage circle */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: pct >= 90 ? '#dcfce7' : pct >= 75 ? '#fef4d6' : '#fee2e2',
                color: pct >= 90 ? '#16a34a' : '#b8870a',
                fontWeight: 700, fontSize: 14
              }}>
                {pct}%
              </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
              {['present', 'absent', 'late', 'excused'].map(s => (
                <div key={s} style={{
                  background: statusColor[s].bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: statusColor[s].color }}>
                    {att?.summary?.[s] || 0}
                  </div>
                  <div style={{ fontSize: 10, color: statusColor[s].color, textTransform: 'capitalize' }}>{s}</div>
                </div>
              ))}
            </div>

            {/* Daily records */}
            {att?.records?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {att.records.map(r => {
                  const sc = statusColor[r.status] || statusColor.present
                  const day = new Date(r.attend_date).getDate()
                  return (
                    <div key={r.id} title={`${r.attend_date}: ${r.status}`} style={{
                      width: 32, height: 32, borderRadius: 6, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', background: sc.bg,
                      fontSize: 10, fontWeight: 600, color: sc.color, cursor: 'default'
                    }}>
                      <span style={{ fontSize: 8, opacity: 0.7 }}>{day}</span>
                      <span>{sc.icon}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 12 }}>
                No attendance records for {MONTHS[month - 1]} {year}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'center' }}>
              {Object.entries(statusColor).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#6b7280' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: val.bg, border: `1px solid ${val.color}` }} />
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                </div>
              ))}
            </div>
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

const selectStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
  fontSize: 14, color: '#374151', background: '#fff', flex: 1
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e5e7eb', marginBottom: 12
}
