import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Badge, t } from '../components/ui'
import api from '../lib/api'

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent || '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { school } = useAuth()
  const sym = school?.countries?.currency_symbol || 'R'
  const [arrears, setArrears] = useState(null)
  const [events,  setEvents]  = useState([])

  useEffect(() => {
    const year = new Date().getFullYear()
    api.get(`/fees/arrears?year=${year}`).then(r => setArrears(r.data)).catch(() => {})
    api.get(`/events?from=${new Date().toISOString().slice(0,10)}`).then(r => setEvents(r.data.slice(0,5))).catch(() => {})
  }, [])

  const report    = arrears?.report || []
  const paid      = report.filter(r => r.status === 'paid').length
  const unpaid    = report.filter(r => r.status === 'unpaid').length
  const partial   = report.filter(r => r.status === 'partial').length
  const collected = report.reduce((s, r) => s + r.total_paid, 0)
  const outstanding = report.reduce((s, r) => s + Math.max(0, r.balance), 0)
  const arrearsList = report.filter(r => r.status !== 'paid' && r.status !== 'no fees').slice(0, 6)

  const EVENT_TYPE_COLOR = { academic: '#2563eb', sports: '#16a34a', meeting: '#ca8a04', holiday: '#db2777', general: '#64748b' }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Welcome back — here's where things stand today.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total learners"  value={report.length} sub="Active this year" />
        <StatCard label="Fully paid"      value={paid}    sub="All fees settled"  accent="#16a34a" />
        <StatCard label="Outstanding"     value={unpaid + partial} sub={`${unpaid} unpaid · ${partial} partial`} accent="#dc2626" />
        <StatCard label="Collected"       value={`${sym}${collected.toLocaleString()}`} sub={`${sym}${outstanding.toLocaleString()} still owed`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Arrears */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Fee arrears</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Learners with outstanding balances</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={t.th}>Learner</th>
                <th style={t.th}>Balance</th>
                <th style={t.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {arrearsList.map(r => (
                <tr key={r.id}>
                  <td style={{ ...t.td, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ ...t.td, fontWeight: 700, color: '#dc2626' }}>{sym}{r.balance.toLocaleString()}</td>
                  <td style={t.td}><Badge status={r.status} /></td>
                </tr>
              ))}
              {arrearsList.length === 0 && (
                <tr><td colSpan={3} style={{ ...t.td, color: '#16a34a', textAlign: 'center', padding: '28px', fontWeight: 600 }}>
                  All learners are up to date ✓
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Events */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '18px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>Upcoming events</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18 }}>Next scheduled school events</div>
          {events.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14 }}>No upcoming events.</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f8fafc' }}>
              <div style={{
                width: 4, borderRadius: 4, flexShrink: 0,
                background: EVENT_TYPE_COLOR[ev.event_type] || '#94a3b8'
              }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {ev.event_type && ` · ${ev.event_type}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
