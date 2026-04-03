import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Badge, t } from '../components/ui'
import * as XLSX from 'xlsx'
import api from '../lib/api'

const TABS = ['arrears', 'payments', 'schedules']

function exportArrears(report, sym, schoolName) {
  const rows = report.map(r => ({
    'Learner':        r.name,
    'Grade':          `${r.grade} ${r.class !== '—' ? r.class : ''}`.trim(),
    'Guardian Phone': r.guardian_phone,
    [`Owed (${sym})`]:  r.total_owed,
    [`Paid (${sym})`]:  r.total_paid,
    [`Balance (${sym})`]: r.balance,
    'Status':         r.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Arrears')
  // Column widths
  ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
  XLSX.writeFile(wb, `${schoolName}_Arrears_${new Date().toISOString().slice(0,10)}.xlsx`)
}

function exportPayments(payments, sym, schoolName) {
  const rows = payments.map(p => ({
    'Date':           new Date(p.payment_date).toLocaleDateString('en-ZA'),
    'Learner':        `${p.learners?.first_name} ${p.learners?.last_name}`,
    'Fee Schedule':   p.fee_schedules?.name || '—',
    [`Amount (${sym})`]: Number(p.amount_paid),
    'Method':         p.payment_method,
    'Reference':      p.reference || '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payments')
  ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 18 }]
  XLSX.writeFile(wb, `${schoolName}_Payments_${new Date().toISOString().slice(0,10)}.xlsx`)
}

export default function Fees() {
  const { school } = useAuth()
  const toast = useToast()
  const sym = school?.countries?.currency_symbol || 'R'
  const schoolName = school?.name || 'School'

  const [tab, setTab]           = useState('arrears')
  const [schedules, setSchedules] = useState([])
  const [payments,  setPayments]  = useState([])
  const [arrears,   setArrears]   = useState(null)
  const [learners,  setLearners]  = useState([])
  const [showSched, setShowSched] = useState(false)
  const [showPay,   setShowPay]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const year = new Date().getFullYear()

  const [sf, setSf] = useState({ name: '', term: '1', year, amount: '', due_date: '' })
  const [pf, setPf] = useState({ learner_id: '', fee_schedule_id: '', amount_paid: '', payment_date: new Date().toISOString().slice(0,10), payment_method: 'cash', reference: '' })

  const loadAll = () => {
    api.get('/fees/schedules').then(r => setSchedules(r.data)).catch(() => {})
    api.get('/fees/payments').then(r => setPayments(r.data)).catch(() => {})
    api.get(`/fees/arrears?year=${year}`).then(r => setArrears(r.data)).catch(() => {})
    api.get('/learners').then(r => setLearners(r.data)).catch(() => {})
  }
  useEffect(() => { loadAll() }, [])

  const saveSched = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/fees/schedules', sf)
      setShowSched(false)
      toast.success('Fee schedule created')
      loadAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create schedule') }
    finally { setSaving(false) }
  }

  const savePay = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/fees/payments', pf)
      setShowPay(false)
      toast.success('Payment recorded successfully')
      loadAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to record payment') }
    finally { setSaving(false) }
  }

  const report = arrears?.report || []

  const ExportBtn = ({ onClick, label }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', background: '#f0fdf4', color: '#15803d',
      border: '1px solid #86efac', borderRadius: 8,
      fontWeight: 600, fontSize: 13, cursor: 'pointer'
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      {label}
    </button>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Fees</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Fee schedules, payments and arrears</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={t.btn.ghost} onClick={() => setShowSched(true)}>+ Fee schedule</button>
          <button style={t.btn.primary} onClick={() => setShowPay(true)}>+ Record payment</button>
        </div>
      </div>

      {/* Tabs + export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {TABS.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, transition: 'all .15s',
              background: tab === tb ? '#fff' : 'none',
              color: tab === tb ? '#1d4ed8' : '#64748b',
              boxShadow: tab === tb ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
            }}>{tb.charAt(0).toUpperCase() + tb.slice(1)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'arrears'  && <ExportBtn label="Export arrears"  onClick={() => { exportArrears(report, sym, schoolName); toast.success('Arrears exported to Excel') }} />}
          {tab === 'payments' && <ExportBtn label="Export payments" onClick={() => { exportPayments(payments, sym, schoolName); toast.success('Payments exported to Excel') }} />}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>

          {tab === 'arrears' && <>
            <thead><tr>
              {['Learner','Grade','Guardian phone','Owed','Paid','Balance','Status'].map(h => <th key={h} style={t.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {report.map(r => (
                <tr key={r.id}>
                  <td style={{ ...t.td, fontWeight: 600 }}>{r.name}</td>
                  <td style={t.td}>{r.grade} {r.class !== '—' ? r.class : ''}</td>
                  <td style={t.td}>{r.guardian_phone}</td>
                  <td style={t.td}>{sym}{r.total_owed.toLocaleString()}</td>
                  <td style={t.td}>{sym}{r.total_paid.toLocaleString()}</td>
                  <td style={{ ...t.td, fontWeight: 700, color: r.balance > 0 ? '#dc2626' : '#16a34a' }}>{sym}{r.balance.toLocaleString()}</td>
                  <td style={t.td}><Badge status={r.status} /></td>
                </tr>
              ))}
              {!report.length && <tr><td colSpan={7} style={{ ...t.td, color: '#94a3b8', textAlign: 'center', padding: 40 }}>No data yet.</td></tr>}
            </tbody>
          </>}

          {tab === 'payments' && <>
            <thead><tr>
              {['Date','Learner','Fee schedule','Amount','Method','Reference'].map(h => <th key={h} style={t.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={t.td}>{new Date(p.payment_date).toLocaleDateString('en-ZA')}</td>
                  <td style={{ ...t.td, fontWeight: 600 }}>{p.learners?.first_name} {p.learners?.last_name}</td>
                  <td style={t.td}>{p.fee_schedules?.name || '—'}</td>
                  <td style={{ ...t.td, fontWeight: 700, color: '#16a34a' }}>{sym}{Number(p.amount_paid).toLocaleString()}</td>
                  <td style={t.td}><Badge status="active" label={p.payment_method} /></td>
                  <td style={t.td}>{p.reference || '—'}</td>
                </tr>
              ))}
              {!payments.length && <tr><td colSpan={6} style={{ ...t.td, color: '#94a3b8', textAlign: 'center', padding: 40 }}>No payments recorded yet.</td></tr>}
            </tbody>
          </>}

          {tab === 'schedules' && <>
            <thead><tr>
              {['Name','Year','Term','Amount','Due date'].map(h => <th key={h} style={t.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {schedules.map(sc => (
                <tr key={sc.id}>
                  <td style={{ ...t.td, fontWeight: 600 }}>{sc.name}</td>
                  <td style={t.td}>{sc.year}</td>
                  <td style={t.td}>Term {sc.term}</td>
                  <td style={{ ...t.td, fontWeight: 700 }}>{sym}{Number(sc.amount).toLocaleString()}</td>
                  <td style={t.td}>{sc.due_date ? new Date(sc.due_date).toLocaleDateString('en-ZA') : '—'}</td>
                </tr>
              ))}
              {!schedules.length && <tr><td colSpan={5} style={{ ...t.td, color: '#94a3b8', textAlign: 'center', padding: 40 }}>No fee schedules yet.</td></tr>}
            </tbody>
          </>}
        </table>
      </div>

      {/* FEE SCHEDULE MODAL */}
      {showSched && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setShowSched(false)}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>New fee schedule</h2>
            <form onSubmit={saveSched}>
              <label style={t.label}>Name *</label>
              <input style={t.input} value={sf.name} onChange={e => setSf(f=>({...f,name:e.target.value}))} placeholder="e.g. Term 1 2026 Tuition" required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Year *</label><input style={t.input} type="number" value={sf.year} onChange={e => setSf(f=>({...f,year:e.target.value}))} required /></div>
                <div><label style={t.label}>Term *</label>
                  <select style={t.input} value={sf.term} onChange={e => setSf(f=>({...f,term:e.target.value}))}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>Term {n}</option>)}
                  </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Amount ({sym}) *</label><input style={t.input} type="number" value={sf.amount} onChange={e => setSf(f=>({...f,amount:e.target.value}))} required /></div>
                <div><label style={t.label}>Due date</label><input style={t.input} type="date" value={sf.due_date} onChange={e => setSf(f=>({...f,due_date:e.target.value}))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShowSched(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPay && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setShowPay(false)}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>Record payment</h2>
            <form onSubmit={savePay}>
              <label style={t.label}>Learner *</label>
              <select style={t.input} value={pf.learner_id} onChange={e => setPf(f=>({...f,learner_id:e.target.value}))} required>
                <option value="">Select learner…</option>
                {learners.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
              </select>
              <label style={t.label}>Fee schedule</label>
              <select style={t.input} value={pf.fee_schedule_id} onChange={e => setPf(f=>({...f,fee_schedule_id:e.target.value}))}>
                <option value="">Select schedule…</option>
                {schedules.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Amount ({sym}) *</label><input style={t.input} type="number" value={pf.amount_paid} onChange={e => setPf(f=>({...f,amount_paid:e.target.value}))} required /></div>
                <div><label style={t.label}>Date *</label><input style={t.input} type="date" value={pf.payment_date} onChange={e => setPf(f=>({...f,payment_date:e.target.value}))} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Method</label>
                  <select style={t.input} value={pf.payment_method} onChange={e => setPf(f=>({...f,payment_method:e.target.value}))}>
                    <option value="cash">Cash</option><option value="eft">EFT</option><option value="other">Other</option>
                  </select></div>
                <div><label style={t.label}>Reference</label><input style={t.input} value={pf.reference} onChange={e => setPf(f=>({...f,reference:e.target.value}))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShowPay(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
