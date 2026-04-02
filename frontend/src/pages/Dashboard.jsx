import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const s = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  sub: { color: '#64748b', fontSize: 14, marginBottom: 28 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  cardLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardValue: { fontSize: 32, fontWeight: 700, color: '#1e293b', margin: '6px 0 2px' },
  cardSub: { fontSize: 13, color: '#64748b' },
  section: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' },
  td: { padding: '10px 0', fontSize: 14, borderBottom: '1px solid #f8fafc', color: '#374151' },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
}

const statusColor = { paid: ['#dcfce7','#16a34a'], partial: ['#fef9c3','#ca8a04'], unpaid: ['#fee2e2','#dc2626'] }

export default function Dashboard() {
  const { school } = useAuth()
  const sym = school?.countries?.currency_symbol || 'R'
  const [arrears, setArrears] = useState(null)
  const [events, setEvents]   = useState([])

  useEffect(() => {
    const year = new Date().getFullYear()
    api.get(`/fees/arrears?year=${year}`).then(r => setArrears(r.data)).catch(() => {})
    api.get(`/events?from=${new Date().toISOString().slice(0,10)}`).then(r => setEvents(r.data.slice(0,5))).catch(() => {})
  }, [])

  const report  = arrears?.report || []
  const paid    = report.filter(r => r.status === 'paid').length
  const partial = report.filter(r => r.status === 'partial').length
  const unpaid  = report.filter(r => r.status === 'unpaid').length
  const totalCollected = report.reduce((s, r) => s + r.total_paid, 0)
  const totalOutstanding = report.reduce((s, r) => s + Math.max(0, r.balance), 0)

  return (
    <div>
      <div style={s.heading}>Dashboard</div>
      <div style={s.sub}>Welcome back — here's where things stand today.</div>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardLabel}>Total learners</div>
          <div style={s.cardValue}>{report.length}</div>
          <div style={s.cardSub}>Active this year</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Fully paid</div>
          <div style={{ ...s.cardValue, color: '#16a34a' }}>{paid}</div>
          <div style={s.cardSub}>All fees settled</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Outstanding</div>
          <div style={{ ...s.cardValue, color: '#dc2626' }}>{unpaid + partial}</div>
          <div style={s.cardSub}>{unpaid} unpaid · {partial} partial</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Collected</div>
          <div style={{ ...s.cardValue, fontSize: 24 }}>{sym}{totalCollected.toLocaleString()}</div>
          <div style={s.cardSub}>{sym}{totalOutstanding.toLocaleString()} still outstanding</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Arrears snapshot */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Fee arrears — top unpaid</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Learner</th>
                <th style={s.th}>Balance</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.filter(r => r.status !== 'paid').slice(0,6).map(r => {
                const [bg, color] = statusColor[r.status]
                return (
                  <tr key={r.id}>
                    <td style={s.td}>{r.name}</td>
                    <td style={s.td}>{sym}{r.balance.toLocaleString()}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: bg, color }}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
              {report.filter(r => r.status !== 'paid').length === 0 &&
                <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={3}>All learners are up to date 🎉</td></tr>
              }
            </tbody>
          </table>
        </div>

        {/* Upcoming events */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Upcoming events</div>
          {events.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14 }}>No upcoming events.</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                {ev.event_type && ` · ${ev.event_type}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
