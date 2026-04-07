import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

export default function Dashboard() {
  const { user, school, children: learners } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const { data: d } = await api.get('/parent-data/dashboard')
      setData(d)
    } catch {}
    setLoading(false)
  }

  const currency = school?.countries?.currency_symbol || 'R'

  if (loading) return <LoadingState />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Hi, {data?.guardian?.first_name || user?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Children cards */}
      {(data?.learners || learners || []).map(child => (
        <div key={child.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
                {child.first_name} {child.last_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {child.classes?.grades?.name} {child.classes?.name} {child.reference_no && `· ${child.reference_no}`}
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: parseFloat(child.fee_summary?.balance) > 0 ? '#fee2e2' : '#dcfce7',
              color: parseFloat(child.fee_summary?.balance) > 0 ? '#dc2626' : '#15803d'
            }}>
              {currency}{child.fee_summary?.balance || '0.00'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <MiniStat label="Total Due" value={`${currency}${child.fee_summary?.total_due || '0.00'}`} />
            <MiniStat label="Paid" value={`${currency}${child.fee_summary?.total_paid || '0.00'}`} color="#16a34a" />
            <MiniStat label="Overdue" value={child.fee_summary?.overdue || 0} color={child.fee_summary?.overdue > 0 ? '#dc2626' : '#64748b'} />
          </div>
        </div>
      ))}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <QuickLink to="/fees" icon="&#128176;" label="Fees" />
        <QuickLink to="/attendance" icon="&#9745;" label="Attendance" />
        <QuickLink to="/grades" icon="&#128202;" label="Grades" />
        <QuickLink to="/announcements" icon="&#128227;" label="News" />
        <QuickLink to="/timetable" icon="&#128197;" label="Timetable" />
        <QuickLink to="/messages" icon="&#128172;" label="Messages" badge={data?.unread_messages} />
      </div>

      {/* Upcoming events */}
      {data?.events?.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>Upcoming Events</div>
          {data.events.slice(0, 3).map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0
              }}>
                {new Date(ev.event_date).getDate()}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, color: '#0f172a' }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {new Date(ev.event_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                  {ev.event_type && ` · ${ev.event_type}`}
                </div>
              </div>
            </div>
          ))}
          <Link to="/events" style={{ display: 'block', textAlign: 'center', color: '#1d4ed8', fontSize: 13, fontWeight: 500, marginTop: 10, textDecoration: 'none' }}>
            View all events
          </Link>
        </div>
      )}

      {/* Recent announcements */}
      {data?.announcements?.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>Latest Announcements</div>
          {data.announcements.slice(0, 3).map(a => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#0f172a' }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                {a.body?.length > 80 ? a.body.slice(0, 80) + '...' : a.body}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {new Date(a.created_at).toLocaleDateString('en-ZA')}
              </div>
            </div>
          ))}
          <Link to="/announcements" style={{ display: 'block', textAlign: 'center', color: '#1d4ed8', fontSize: 13, fontWeight: 500, marginTop: 10, textDecoration: 'none' }}>
            View all announcements
          </Link>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color || '#0f172a' }}>{value}</div>
    </div>
  )
}

function QuickLink({ to, icon, label, badge }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
      background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
      textDecoration: 'none', color: '#0f172a', fontSize: 14, fontWeight: 500,
      position: 'relative'
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', right: 12, background: '#dc2626', color: '#fff',
          fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 7px'
        }}>{badge}</span>
      )}
    </Link>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: '#64748b' }}>
      Loading...
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e2e8f0', marginBottom: 12
}
