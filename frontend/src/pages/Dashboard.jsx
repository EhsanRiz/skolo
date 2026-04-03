import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Badge, t } from '../components/ui'
import api from '../lib/api'

const CSS = `
@keyframes drawerIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  border: 2px solid transparent;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
  border-color: #e2e8f0;
}
`

// Slide-in drawer for learners (handles long lists)
function LearnersDrawer({ report, sym, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = report.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group by grade
  const grouped = filtered.reduce((acc, r) => {
    const grade = r.grade || 'Unassigned'
    if (!acc[grade]) acc[grade] = []
    acc[grade].push(r)
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', justifyContent: 'flex-end',
      animation: 'overlayIn 0.2s ease both'
    }}>
      {/* Dim overlay */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '60%', maxWidth: 680,
        background: '#fff', height: '100vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.15)',
        animation: 'drawerIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>All Learners</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{report.length} active · grouped by grade</div>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search learners…"
            style={{ width: '100%', padding: '9px 13px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 28px' }}>
          {Object.entries(grouped).map(([grade, learners]) => (
            <div key={grade} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{grade}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1d4ed8', borderRadius: 20, padding: '1px 8px' }}>{learners.length}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                {learners.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderTop: i > 0 ? '1px solid #f8fafc' : 'none'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.guardian_phone}</div>
                    </div>
                    <Badge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 }}>No learners match your search.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact modal for paid/outstanding/collected
function ReportModal({ title, subtitle, children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)',
      animation: 'overlayIn 0.2s ease both', padding: '20px'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        animation: 'modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div className="stat-card" onClick={onClick}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 10, fontWeight: 500 }}>Click to view →</div>
    </div>
  )
}

const EVENT_TYPE_COLOR = { academic: '#2563eb', sports: '#16a34a', meeting: '#ca8a04', holiday: '#db2777', general: '#64748b' }

export default function Dashboard() {
  const { school } = useAuth()
  const sym = school?.countries?.currency_symbol || 'R'
  const [arrears, setArrears] = useState(null)
  const [events,  setEvents]  = useState([])
  const [activeModal, setActiveModal] = useState(null) // null | 'learners' | 'paid' | 'outstanding' | 'collected'
  const [payments, setPayments] = useState([])

  useEffect(() => {
    const year = new Date().getFullYear()
    api.get(`/fees/arrears?year=${year}`).then(r => setArrears(r.data)).catch(() => {})
    api.get(`/events?from=${new Date().toISOString().slice(0,10)}`).then(r => setEvents(r.data.slice(0,5))).catch(() => {})
    api.get('/fees/payments').then(r => setPayments(r.data)).catch(() => {})
  }, [])

  const report      = arrears?.report || []
  const paid        = report.filter(r => r.status === 'paid')
  const outstanding = report.filter(r => r.status !== 'paid' && r.status !== 'no fees')
  const collected   = report.reduce((s, r) => s + r.total_paid, 0)
  const totalOwed   = report.reduce((s, r) => s + r.total_owed, 0)
  const arrearsList = outstanding.slice(0, 6)

  // Group payments by term for collected modal
  const byTerm = payments.reduce((acc, p) => {
    const key = p.fee_schedules ? `Term ${p.fee_schedules.term} ${p.fee_schedules.year}` : 'Other'
    if (!acc[key]) acc[key] = 0
    acc[key] += Number(p.amount_paid)
    return acc
  }, {})

  const close = () => setActiveModal(null)

  return (
    <>
      <style>{CSS}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Welcome back — here's where things stand today.</p>
      </div>

      {/* Stat cards — all clickable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Total learners" value={report.length} sub="Active this year"
          onClick={() => setActiveModal('learners')} />
        <StatCard
          label="Fully paid" value={paid.length} sub="All fees settled" accent="#16a34a"
          onClick={() => setActiveModal('paid')} />
        <StatCard
          label="Outstanding" value={outstanding.length}
          sub={`${outstanding.filter(r=>r.status==='unpaid').length} unpaid · ${outstanding.filter(r=>r.status==='partial').length} partial`}
          accent="#dc2626" onClick={() => setActiveModal('outstanding')} />
        <StatCard
          label="Collected" value={`${sym}${collected.toLocaleString()}`}
          sub={`${sym}${Math.max(0, totalOwed - collected).toLocaleString()} still owed`}
          onClick={() => setActiveModal('collected')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Arrears snapshot */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Fee arrears</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Learners with outstanding balances</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={t.th}>Learner</th>
              <th style={t.th}>Balance</th>
              <th style={t.th}>Status</th>
            </tr></thead>
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

        {/* Upcoming events */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '18px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>Upcoming events</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18 }}>Next scheduled school events</div>
          {events.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14 }}>No upcoming events.</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 3, borderRadius: 4, flexShrink: 0, alignSelf: 'stretch', background: EVENT_TYPE_COLOR[ev.event_type] || '#94a3b8' }} />
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

      {/* ── MODALS ── */}

      {/* Total Learners → Drawer */}
      {activeModal === 'learners' && <LearnersDrawer report={report} sym={sym} onClose={close} />}

      {/* Fully Paid */}
      {activeModal === 'paid' && (
        <ReportModal title="Fully Paid Learners" subtitle={`${paid.length} learners with all fees settled`} onClose={close}>
          {paid.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>No fully paid learners yet.</div>}
          {paid.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid #f8fafc' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.grade} {r.class !== '—' ? r.class : ''}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>{sym}{r.total_paid.toLocaleString()}</div>
            </div>
          ))}
        </ReportModal>
      )}

      {/* Outstanding */}
      {activeModal === 'outstanding' && (
        <ReportModal title="Outstanding Fees" subtitle={`${outstanding.length} learners with unpaid or partial balances`} onClose={close}>
          {outstanding.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>All fees are settled.</div>}
          {outstanding.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: i > 0 ? '1px solid #f8fafc' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {r.grade} · 📱 {r.guardian_phone}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>{sym}{r.balance.toLocaleString()}</div>
                <Badge status={r.status} />
              </div>
            </div>
          ))}
        </ReportModal>
      )}

      {/* Collected */}
      {activeModal === 'collected' && (
        <ReportModal title="Fees Collected" subtitle="Breakdown by term" onClose={close}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Total collected</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#16a34a' }}>{sym}{collected.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#fef2f2', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Still outstanding</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#dc2626' }}>{sym}{Math.max(0, totalOwed - collected).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>By term</div>
          {Object.entries(byTerm).map(([term, amount], i) => (
            <div key={term} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ fontWeight: 500, fontSize: 14, color: '#374151' }}>{term}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>{sym}{amount.toLocaleString()}</div>
            </div>
          ))}
          {Object.keys(byTerm).length === 0 && <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No payments recorded yet.</div>}
        </ReportModal>
      )}
    </>
  )
}
