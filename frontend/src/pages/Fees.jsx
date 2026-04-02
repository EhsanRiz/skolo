import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const s = {
  tabs: { display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: 'none', color: '#64748b' },
  activeTab: { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 700 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 },
  table: { width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#94a3b8', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: 14, borderTop: '1px solid #f1f5f9', color: '#374151' },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 440 },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
}

const statusColor = { paid: ['#dcfce7','#16a34a'], partial: ['#fef9c3','#ca8a04'], unpaid: ['#fee2e2','#dc2626'] }

export default function Fees() {
  const { school } = useAuth()
  const sym = school?.countries?.currency_symbol || 'R'
  const [tab, setTab] = useState('arrears')
  const [schedules, setSchedules] = useState([])
  const [payments, setPayments]   = useState([])
  const [arrears, setArrears]     = useState(null)
  const [learners, setLearners]   = useState([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [sf, setSf] = useState({ name: '', term: '1', year: new Date().getFullYear(), amount: '', due_date: '' })
  const [pf, setPf] = useState({ learner_id: '', fee_schedule_id: '', amount_paid: '', payment_date: new Date().toISOString().slice(0,10), payment_method: 'cash', reference: '', notes: '' })

  const year = new Date().getFullYear()

  const loadAll = () => {
    api.get('/fees/schedules').then(r => setSchedules(r.data)).catch(() => {})
    api.get('/fees/payments').then(r => setPayments(r.data)).catch(() => {})
    api.get(`/fees/arrears?year=${year}`).then(r => setArrears(r.data)).catch(() => {})
    api.get('/learners').then(r => setLearners(r.data)).catch(() => {})
  }

  useEffect(() => { loadAll() }, [])

  const saveSchedule = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/fees/schedules', sf)
      setShowScheduleModal(false); loadAll()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const savePayment = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/fees/payments', pf)
      setShowPaymentModal(false); loadAll()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const report = arrears?.report || []

  return (
    <div>
      <div style={s.header}>
        <div style={s.heading}>Fees</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={() => setShowScheduleModal(true)}>+ Fee schedule</button>
          <button style={{ ...s.btn, background: '#16a34a' }} onClick={() => setShowPaymentModal(true)}>+ Record payment</button>
        </div>
      </div>

      <div style={s.tabs}>
        {['arrears','payments','schedules'].map(t => (
          <button key={t} style={{ ...s.tab, ...(tab === t ? s.activeTab : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ARREARS */}
      {tab === 'arrears' && (
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Learner</th>
            <th style={s.th}>Grade</th>
            <th style={s.th}>Guardian phone</th>
            <th style={s.th}>Owed</th>
            <th style={s.th}>Paid</th>
            <th style={s.th}>Balance</th>
            <th style={s.th}>Status</th>
          </tr></thead>
          <tbody>
            {report.map(r => {
              const [bg, color] = statusColor[r.status]
              return (
                <tr key={r.id}>
                  <td style={s.td}>{r.name}</td>
                  <td style={s.td}>{r.grade} {r.class}</td>
                  <td style={s.td}>{r.guardian_phone}</td>
                  <td style={s.td}>{sym}{r.total_owed.toLocaleString()}</td>
                  <td style={s.td}>{sym}{r.total_paid.toLocaleString()}</td>
                  <td style={{ ...s.td, fontWeight: 700 }}>{sym}{r.balance.toLocaleString()}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: bg, color }}>{r.status}</span></td>
                </tr>
              )
            })}
            {report.length === 0 && <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={7}>No data yet.</td></tr>}
          </tbody>
        </table>
      )}

      {/* PAYMENTS */}
      {tab === 'payments' && (
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Date</th>
            <th style={s.th}>Learner</th>
            <th style={s.th}>Fee schedule</th>
            <th style={s.th}>Amount</th>
            <th style={s.th}>Method</th>
            <th style={s.th}>Reference</th>
          </tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={s.td}>{new Date(p.payment_date).toLocaleDateString('en-ZA')}</td>
                <td style={s.td}>{p.learners?.first_name} {p.learners?.last_name}</td>
                <td style={s.td}>{p.fee_schedules?.name || '—'}</td>
                <td style={s.td}>{sym}{Number(p.amount_paid).toLocaleString()}</td>
                <td style={s.td}>{p.payment_method}</td>
                <td style={s.td}>{p.reference || '—'}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={6}>No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      )}

      {/* SCHEDULES */}
      {tab === 'schedules' && (
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Name</th>
            <th style={s.th}>Year</th>
            <th style={s.th}>Term</th>
            <th style={s.th}>Amount</th>
            <th style={s.th}>Due date</th>
          </tr></thead>
          <tbody>
            {schedules.map(sc => (
              <tr key={sc.id}>
                <td style={s.td}>{sc.name}</td>
                <td style={s.td}>{sc.year}</td>
                <td style={s.td}>Term {sc.term}</td>
                <td style={s.td}>{sym}{Number(sc.amount).toLocaleString()}</td>
                <td style={s.td}>{sc.due_date ? new Date(sc.due_date).toLocaleDateString('en-ZA') : '—'}</td>
              </tr>
            ))}
            {schedules.length === 0 && <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={5}>No fee schedules yet.</td></tr>}
          </tbody>
        </table>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowScheduleModal(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>New fee schedule</div>
            <form onSubmit={saveSchedule}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={sf.name} onChange={e => setSf(f=>({...f,name:e.target.value}))} placeholder="e.g. Term 1 2026 Tuition" required />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Year *</label>
                  <input style={s.input} type="number" value={sf.year} onChange={e => setSf(f=>({...f,year:e.target.value}))} required />
                </div>
                <div>
                  <label style={s.label}>Term *</label>
                  <select style={s.input} value={sf.term} onChange={e => setSf(f=>({...f,term:e.target.value}))}>
                    {[1,2,3,4].map(t => <option key={t} value={t}>Term {t}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Amount ({sym}) *</label>
                  <input style={s.input} type="number" value={sf.amount} onChange={e => setSf(f=>({...f,amount:e.target.value}))} required />
                </div>
                <div>
                  <label style={s.label}>Due date</label>
                  <input style={s.input} type="date" value={sf.due_date} onChange={e => setSf(f=>({...f,due_date:e.target.value}))} />
                </div>
              </div>
              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>Record payment</div>
            <form onSubmit={savePayment}>
              <label style={s.label}>Learner *</label>
              <select style={s.input} value={pf.learner_id} onChange={e => setPf(f=>({...f,learner_id:e.target.value}))} required>
                <option value="">Select learner…</option>
                {learners.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
              </select>
              <label style={s.label}>Fee schedule</label>
              <select style={s.input} value={pf.fee_schedule_id} onChange={e => setPf(f=>({...f,fee_schedule_id:e.target.value}))}>
                <option value="">Select schedule…</option>
                {schedules.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Amount ({sym}) *</label>
                  <input style={s.input} type="number" value={pf.amount_paid} onChange={e => setPf(f=>({...f,amount_paid:e.target.value}))} required />
                </div>
                <div>
                  <label style={s.label}>Date *</label>
                  <input style={s.input} type="date" value={pf.payment_date} onChange={e => setPf(f=>({...f,payment_date:e.target.value}))} required />
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Method</label>
                  <select style={s.input} value={pf.payment_method} onChange={e => setPf(f=>({...f,payment_method:e.target.value}))}>
                    <option value="cash">Cash</option>
                    <option value="eft">EFT</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Reference</label>
                  <input style={s.input} value={pf.reference} onChange={e => setPf(f=>({...f,reference:e.target.value}))} />
                </div>
              </div>
              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
