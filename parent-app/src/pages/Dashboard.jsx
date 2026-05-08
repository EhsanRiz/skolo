import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../lib/api'

const COLORS = ['#16a34a', '#e5e7eb']
const ATT_COLORS = { present: '#16a34a', late: '#f7c548', absent: '#dc2626', excused: '#9ca3af' }

export default function Dashboard() {
  const { user, school } = useAuth()
  const navigate = useNavigate()
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

  const currency = school?.countries?.currency_symbol || 'M'

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#003049', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading dashboard...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Compute aggregates
  const learners = data?.learners || []
  const totalBalance = learners.reduce((s, l) => s + parseFloat(l.fee_summary?.balance || 0), 0)
  const totalDue = learners.reduce((s, l) => s + parseFloat(l.fee_summary?.total_due || 0), 0)
  const totalPaid = learners.reduce((s, l) => s + parseFloat(l.fee_summary?.total_paid || 0), 0)
  const avgAttendance = learners.filter(l => l.attendance?.rate != null).length > 0
    ? Math.round(learners.filter(l => l.attendance?.rate != null).reduce((s, l) => s + l.attendance.rate, 0) / learners.filter(l => l.attendance?.rate != null).length)
    : null
  const latestAvg = learners.filter(l => l.latest_grade?.average != null).length > 0
    ? Math.round(learners.filter(l => l.latest_grade?.average != null).reduce((s, l) => s + l.latest_grade.average, 0) / learners.filter(l => l.latest_grade?.average != null).length)
    : null
  const unread = data?.unread_messages || 0

  // Pie chart data
  const feeChartData = totalDue > 0
    ? [{ name: 'Paid', value: Math.round(totalPaid) }, { name: 'Outstanding', value: Math.round(totalDue - totalPaid) }]
    : []

  // Attendance bar data per child
  const attBarData = learners.filter(l => l.attendance?.total > 0).map(l => ({
    name: l.first_name,
    present: l.attendance.present,
    late: l.attendance.late,
    absent: l.attendance.absent,
    excused: l.attendance.excused
  }))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .stat-card { animation: fadeUp 0.4s ease both; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .dash-card { animation: fadeUp 0.5s ease both; }
      `}</style>

      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px', margin: 0 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {data?.guardian?.first_name || user?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="OUTSTANDING" value={`${currency}${totalBalance.toFixed(0)}`}
          sub={totalBalance > 0 ? `${currency}${totalPaid.toFixed(0)} paid` : 'All paid up'}
          color={totalBalance > 0 ? '#b8870a' : '#16a34a'} delay={0}
          onClick={() => navigate('/fees')} />
        <StatCard label="ATTENDANCE" value={avgAttendance != null ? `${avgAttendance}%` : '—'}
          sub={`${new Date().toLocaleString('en-ZA', { month: 'long' })} school-wide`}
          color={avgAttendance >= 80 ? '#16a34a' : avgAttendance >= 60 ? '#f7c548' : '#dc2626'} delay={60}
          onClick={() => navigate('/attendance')} />
        <StatCard label="GRADE AVG" value={latestAvg != null ? `${latestAvg}%` : '—'}
          sub={learners[0]?.latest_grade ? `Term ${learners[0].latest_grade.term}` : 'No results yet'}
          color="#003049" delay={120}
          onClick={() => navigate('/grades')} />
        <StatCard label="MESSAGES" value={unread}
          sub={unread > 0 ? 'unread' : 'No new messages'}
          color={unread > 0 ? '#7c3aed' : '#6b7280'} delay={180}
          onClick={() => navigate('/messages')} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Fee Overview Donut */}
        <div className="dash-card" style={{ ...cardStyle, animationDelay: '0.2s' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Fee Overview</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{new Date().getFullYear()} — paid vs outstanding</div>
          {feeChartData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={feeChartData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {feeChartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#16a34a' }} />
                  <span style={{ fontSize: 13, color: '#1f2937' }}>Paid: <strong>{currency}{totalPaid.toFixed(0)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#e5e7eb' }} />
                  <span style={{ fontSize: 13, color: '#1f2937' }}>Outstanding: <strong>{currency}{(totalDue - totalPaid).toFixed(0)}</strong></span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                  {totalDue > 0 ? `${Math.round((totalPaid / totalDue) * 100)}% collected` : 'No fees due'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>No fee data yet</div>
          )}
        </div>

        {/* Attendance Bar Chart */}
        <div className="dash-card" style={{ ...cardStyle, animationDelay: '0.3s' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Attendance This Month</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{new Date().toLocaleString('en-ZA', { month: 'long' })} — by child</div>
          {attBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(120, attBarData.length * 50 + 40)}>
              <BarChart data={attBarData} layout="vertical" barSize={14} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" />
                <XAxis type="number" fontSize={11} stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" width={60} fontSize={12} stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="present" stackId="a" fill={ATT_COLORS.present} name="Present" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" stackId="a" fill={ATT_COLORS.late} name="Late" />
                <Bar dataKey="absent" stackId="a" fill={ATT_COLORS.absent} name="Absent" />
                <Bar dataKey="excused" stackId="a" fill={ATT_COLORS.excused} name="Excused" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>No attendance data this month</div>
          )}
        </div>
      </div>

      {/* Monthly Fee Trend */}
      {data?.monthly_fees?.length > 0 && (
        <div className="dash-card" style={{ ...cardStyle, marginBottom: 24, animationDelay: '0.35s' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>Fee Collection Trend</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Monthly due vs paid — {new Date().getFullYear()}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_fees} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f7f7f7" />
              <XAxis dataKey="month" fontSize={11} stroke="#9ca3af" />
              <YAxis fontSize={11} stroke="#9ca3af" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="due" name="Due" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Children cards */}
      {learners.length > 0 && (
        <div className="dash-card" style={{ ...cardStyle, marginBottom: 24, animationDelay: '0.4s' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 14 }}>Your Children</div>
          {learners.map(child => (
            <div key={child.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid #f7f7f7'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#f0f5fa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: '#003049', fontSize: 15
                }}>{child.first_name[0]}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{child.first_name} {child.last_name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {child.classes?.grades?.name} {child.classes?.name} {child.reference_no && `\u00B7 ${child.reference_no}`}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: parseFloat(child.fee_summary?.balance) > 0 ? '#fee2e2' : '#dcfce7',
                  color: parseFloat(child.fee_summary?.balance) > 0 ? '#dc2626' : '#15803d'
                }}>
                  {currency}{child.fee_summary?.balance || '0.00'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Feed Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Upcoming Events */}
        <div className="dash-card" style={{ ...cardStyle, animationDelay: '0.45s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Upcoming Events</div>
            <Link to="/events" style={{ fontSize: 12, color: '#003049', fontWeight: 600, textDecoration: 'none' }}>View all &rarr;</Link>
          </div>
          {(data?.events || []).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No upcoming events</div>
          ) : data.events.slice(0, 4).map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #fafafa' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#f0f5fa', color: '#003049',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0
              }}>{new Date(ev.event_date).getDate()}</div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, color: '#1f2937' }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {new Date(ev.event_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                  {ev.event_type && ` \u00B7 ${ev.event_type}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Announcements */}
        <div className="dash-card" style={{ ...cardStyle, animationDelay: '0.5s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Announcements</div>
            <Link to="/announcements" style={{ fontSize: 12, color: '#003049', fontWeight: 600, textDecoration: 'none' }}>View all &rarr;</Link>
          </div>
          {(data?.announcements || []).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No announcements</div>
          ) : data.announcements.slice(0, 4).map(a => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #fafafa' }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1f2937' }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                {a.body?.length > 70 ? a.body.slice(0, 70) + '...' : a.body}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                {new Date(a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, delay, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      border: '1px solid #e5e7eb', animationDelay: `${delay}ms`,
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 14, padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #e5e7eb'
}
