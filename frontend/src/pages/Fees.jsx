import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Badge, t } from '../components/ui'
import * as XLSX from 'xlsx'
import api from '../lib/api'

const STATUS_STYLE = {
  paid:    { bg: '#dcfce7', color: '#15803d' },
  partial: { bg: '#fef9c3', color: '#a16207' },
  overdue: { bg: '#fee2e2', color: '#dc2626' },
  pending: { bg: '#f1f5f9', color: '#64748b' },
}

const PAYMENT_METHODS = [
  { value: 'cash',           label: 'Cash' },
  { value: 'eft',            label: 'EFT / Bank Transfer' },
  { value: 'mobile_money',   label: 'Mobile Money (M-Pesa)' },
  { value: 'ewallet',        label: 'eWallet' },
  { value: 'snapscan',       label: 'SnapScan' },
  { value: 'other',          label: 'Other' },
]

const TABS = ['ledger', 'payments', 'schedules']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function StatusBadge({ status }) {
  const c = STATUS_STYLE[status] || STATUS_STYLE.pending
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:c.bg, color:c.color }}>{status}</span>
}

function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}

function exportLedger(ledger, sym, schoolName) {
  const rows = ledger.map(r => ({
    'Ref No':        r.learners?.reference_no || '—',
    'Learner':       `${r.learners?.first_name} ${r.learners?.last_name}`,
    'Grade':         r.learners?.classes?.grades?.name || '—',
    'Class':         r.learners?.classes?.name || '—',
    'Description':   r.description,
    'Due date':      r.due_date,
    [`Due (${sym})`]:    Number(r.amount_due),
    [`Paid (${sym})`]:   Number(r.amount_paid),
    [`Balance (${sym})`]: Number(r.amount_due) - Number(r.amount_paid),
    'Status':        r.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [10,22,10,8,28,12,12,12,12,10].map(w=>({wch:w}))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Ledger')
  XLSX.writeFile(wb, `${schoolName}_FeeLedger_${new Date().toISOString().slice(0,10)}.xlsx`)
}

export default function Fees() {
  const { school } = useAuth()
  const toast = useToast()
  const sym = school?.countries?.currency_symbol || 'R'
  const schoolName = school?.name || 'School'

  const [tab, setTab] = useState('ledger')
  const [ledger,   setLedger]   = useState([])
  const [summary,  setSummary]  = useState(null)
  const [ledgerFilter, setLedgerFilter] = useState({ status: '', month: new Date().toISOString().slice(0,7) })
  const [loadingLedger, setLoadingLedger] = useState(false)

  const [showGenerate, setShowGenerate] = useState(false)
  const [genForm, setGenForm] = useState({ frequency:'monthly', year:new Date().getFullYear(), month:new Date().getMonth()+1, term:1, due_date:'' })
  const [generating, setGenerating] = useState(false)

  const [payEntry, setPayEntry] = useState(null)
  const [payForm,  setPayForm]  = useState({ amount:'', payment_method:'cash', notes:'' })
  const [paying,   setPaying]   = useState(false)

  // Old tabs
  const [schedules, setSchedules] = useState([])
  const [payments,  setPayments]  = useState([])
  const [learners,  setLearners]  = useState([])
  const [showPay,   setShowPay]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const year = new Date().getFullYear()
  const [pf, setPf] = useState({ learner_id:'', fee_schedule_id:'', amount_paid:'', payment_date:new Date().toISOString().slice(0,10), payment_method:'cash', reference:'' })

  const loadLedger = async () => {
    setLoadingLedger(true)
    try {
      const params = new URLSearchParams()
      if (ledgerFilter.status) params.append('status', ledgerFilter.status)
      if (ledgerFilter.month)  params.append('month',  ledgerFilter.month)
      const { data } = await api.get(`/fee-ledger?${params}`)
      setLedger(data)
    } catch { } finally { setLoadingLedger(false) }
  }

  const loadSummary = async () => {
    try { const { data } = await api.get(`/fee-ledger/summary?year=${year}`); setSummary(data) } catch { }
  }

  const loadOld = () => {
    api.get('/fees/schedules').then(r=>setSchedules(r.data)).catch(()=>{})
    api.get('/fees/payments').then(r=>setPayments(r.data)).catch(()=>{})
    api.get('/learners').then(r=>setLearners(r.data)).catch(()=>{})
  }

  useEffect(() => { loadLedger(); loadSummary() }, [])
  useEffect(() => { loadLedger() }, [ledgerFilter])
  useEffect(() => { if (tab !== 'ledger') loadOld() }, [tab])

  const generate = async e => {
    e.preventDefault(); setGenerating(true)
    try {
      const { data } = await api.post('/fee-ledger/generate', genForm)
      setShowGenerate(false)
      toast.success(`Generated ${data.created} entries · ${data.skipped} already existed`)
      loadLedger(); loadSummary()
    } catch (err) { toast.error(err.response?.data?.error || 'Generation failed') }
    finally { setGenerating(false) }
  }

  const deleteEntry = async (id) => {
    if (!confirm('Delete this fee entry? This cannot be undone.')) return
    try {
      await api.delete(`/fee-ledger/${id}`)
      toast.success('Entry deleted')
      loadLedger(); loadSummary()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  const recordPay = async e => {
    e.preventDefault(); setPaying(true)
    try {
      await api.post(`/fee-ledger/${payEntry.id}/pay`, payForm)
      toast.success('Payment recorded')
      setPayEntry(null); loadLedger(); loadSummary()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setPaying(false) }
  }

  const openPay = entry => {
    const remaining = Number(entry.amount_due) - Number(entry.amount_paid)
    setPayForm({ amount: remaining.toFixed(2), payment_method: 'cash', notes: '' })
    setPayEntry(entry)
  }

  const savePay = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/fees/payments', pf); setShowPay(false); toast.success('Payment recorded'); loadOld() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const overdueCount = ledger.filter(r => r.status === 'overdue').length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>Fees</h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>Fee ledger, payments and schedules</p>
        </div>
        {tab === 'ledger' && (
          <button style={t.btn.primary} onClick={() => setShowGenerate(true)}>⚡ Generate fees</button>
        )}
        {tab === 'payments' && (
          <button style={t.btn.primary} onClick={() => setShowPay(true)}>+ Record payment</button>
        )}
      </div>

      {/* Summary cards */}
      {tab === 'ledger' && summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total due this year', value:`${sym}${summary.totalDue.toLocaleString()}`,     color:'#0f172a' },
            { label:'Collected',           value:`${sym}${summary.totalPaid.toLocaleString()}`,    color:'#16a34a' },
            { label:'Outstanding',         value:`${sym}${summary.outstanding.toLocaleString()}`,  color:'#1d4ed8' },
            { label:'Overdue entries',     value:summary.overdueCount,                             color:'#dc2626' },
          ].map(c => (
            <div key={c.label} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize:24, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + filter */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:2, background:'#f1f5f9', borderRadius:10, padding:4 }}>
          {TABS.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer',
              fontWeight:600, fontSize:13, transition:'all .15s',
              background: tab===tb ? '#fff' : 'none',
              color: tab===tb ? '#0f2044' : '#64748b',
              boxShadow: tab===tb ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
            }}>
              {tb === 'ledger' ? '📋 Ledger' : tb.charAt(0).toUpperCase()+tb.slice(1)}
              {tb === 'ledger' && overdueCount > 0 && (
                <span style={{ marginLeft:6, background:'#dc2626', color:'#fff', borderRadius:20, padding:'1px 7px', fontSize:11 }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'ledger' && (
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <select value={ledgerFilter.month} onChange={e => setLedgerFilter(f=>({...f,month:e.target.value}))}
              style={{ padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff' }}>
              {Array.from({length:12},(_,i) => {
                const m = String(i+1).padStart(2,'0')
                return <option key={i} value={`${year}-${m}`}>{MONTHS[i]} {year}</option>
              })}
            </select>
            <select value={ledgerFilter.status} onChange={e => setLedgerFilter(f=>({...f,status:e.target.value}))}
              style={{ padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff' }}>
              <option value="">All statuses</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <button onClick={() => { exportLedger(ledger, sym, schoolName); toast.success('Exported to Excel') }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#f0fdf4', color:'#15803d', border:'1px solid #86efac', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              ⬇ Export
            </button>
          </div>
        )}
      </div>

      {/* LEDGER TAB */}
      {tab === 'ledger' && (
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Ref','Learner','Grade','Description','Due date','Due','Paid','Balance','Status',''].map(h=>
                <th key={h} style={t.th}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {loadingLedger && <tr><td colSpan={10} style={{ ...t.td, textAlign:'center', color:'#94a3b8', padding:40 }}>Loading…</td></tr>}
              {!loadingLedger && ledger.map(row => {
                const balance = Number(row.amount_due) - Number(row.amount_paid)
                const isOverdue = row.status === 'overdue'
                return (
                  <tr key={row.id} style={{ background: isOverdue ? '#fff9f9' : '' }}>
                    <td style={{ ...t.td, fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.5px' }}>
                      {row.learners?.reference_no || '—'}
                    </td>
                    <td style={{ ...t.td, fontWeight:600, color:'#0f172a' }}>
                      {row.learners?.first_name} {row.learners?.last_name}
                    </td>
                    <td style={t.td}>
                      {row.learners?.classes?.grades?.name || '—'}{' '}{row.learners?.classes?.name || ''}
                    </td>
                    <td style={t.td}>{row.description}</td>
                    <td style={{ ...t.td, fontSize:12, color: isOverdue ? '#dc2626' : '#64748b' }}>
                      {new Date(row.due_date).toLocaleDateString('en-ZA')}
                      {isOverdue && <div style={{ fontSize:10, fontWeight:700 }}>OVERDUE</div>}
                    </td>
                    <td style={t.td}>{sym}{Number(row.amount_due).toLocaleString()}</td>
                    <td style={{ ...t.td, color:'#16a34a', fontWeight:600 }}>{sym}{Number(row.amount_paid).toLocaleString()}</td>
                    <td style={{ ...t.td, fontWeight:700, color: balance>0 ? '#dc2626' : '#16a34a' }}>
                      {sym}{balance.toLocaleString()}
                    </td>
                    <td style={t.td}><StatusBadge status={row.status} /></td>
                    <td style={{ ...t.td, display:'flex', gap:6, alignItems:'center' }}>
                      {row.status !== 'paid' && (
                        <button onClick={() => openPay(row)} style={{ ...t.btn.primary, padding:'5px 12px', fontSize:12 }}>Pay</button>
                      )}
                      <button onClick={() => deleteEntry(row.id)} title="Delete entry"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, border:'1px solid #fca5a5', borderRadius:6, background:'#fff', color:'#dc2626', cursor:'pointer' }}>
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!loadingLedger && ledger.length === 0 && (
                <tr><td colSpan={10} style={{ ...t.td, textAlign:'center', color:'#94a3b8', padding:48 }}>
                  <div style={{ marginBottom:8, fontSize:20 }}>📋</div>
                  No fee entries for this period. Click <strong>Generate fees</strong> to create entries.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {tab === 'payments' && (
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Date','Learner','Fee schedule','Amount','Method','Reference'].map(h=><th key={h} style={t.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={t.td}>{new Date(p.payment_date).toLocaleDateString('en-ZA')}</td>
                  <td style={{ ...t.td, fontWeight:600 }}>{p.learners?.first_name} {p.learners?.last_name}</td>
                  <td style={t.td}>{p.fee_schedules?.name || '—'}</td>
                  <td style={{ ...t.td, fontWeight:700, color:'#16a34a' }}>{sym}{Number(p.amount_paid).toLocaleString()}</td>
                  <td style={t.td}>{PAYMENT_METHODS.find(m=>m.value===p.payment_method)?.label || p.payment_method}</td>
                  <td style={t.td}>{p.reference || '—'}</td>
                </tr>
              ))}
              {!payments.length && <tr><td colSpan={6} style={{ ...t.td, color:'#94a3b8', textAlign:'center', padding:40 }}>No payments recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULES TAB */}
      {tab === 'schedules' && (
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Name','Year','Term','Amount','Due date'].map(h=><th key={h} style={t.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {schedules.map(sc => (
                <tr key={sc.id}>
                  <td style={{ ...t.td, fontWeight:600 }}>{sc.name}</td>
                  <td style={t.td}>{sc.year}</td>
                  <td style={t.td}>Term {sc.term}</td>
                  <td style={{ ...t.td, fontWeight:700 }}>{sym}{Number(sc.amount).toLocaleString()}</td>
                  <td style={t.td}>{sc.due_date ? new Date(sc.due_date).toLocaleDateString('en-ZA') : '—'}</td>
                </tr>
              ))}
              {!schedules.length && <tr><td colSpan={5} style={{ ...t.td, color:'#94a3b8', textAlign:'center', padding:40 }}>No fee schedules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* GENERATE FEES MODAL */}
      {showGenerate && (
        <div style={t.overlay} onClick={e => e.target===e.currentTarget && setShowGenerate(false)}>
          <div style={{ ...t.modal, maxWidth:440 }}>
            <h2 style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>Generate fees</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
              Creates one fee entry per learner from active fee plans. Existing entries are skipped.
            </p>
            <form onSubmit={generate}>
              <label style={t.label}>Frequency</label>
              <select style={t.input} value={genForm.frequency} onChange={e => setGenForm(f=>({...f,frequency:e.target.value}))}>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={t.label}>Year *</label>
                  <input style={t.input} type="number" value={genForm.year} onChange={e => setGenForm(f=>({...f,year:Number(e.target.value)}))} required />
                </div>
                {genForm.frequency === 'monthly' ? (
                  <div>
                    <label style={t.label}>Month *</label>
                    <select style={t.input} value={genForm.month} onChange={e => setGenForm(f=>({...f,month:Number(e.target.value)}))}>
                      {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={t.label}>Term *</label>
                    <select style={t.input} value={genForm.term} onChange={e => setGenForm(f=>({...f,term:Number(e.target.value)}))}>
                      {[1,2,3,4].map(n => <option key={n} value={n}>Term {n}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <label style={t.label}>Override due date <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span></label>
              <input style={t.input} type="date" value={genForm.due_date} onChange={e => setGenForm(f=>({...f,due_date:e.target.value}))} />
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#78350f' }}>
                ⚠ Make sure Fee Plans are set up in Settings → Fee Plans first.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShowGenerate(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={generating}>{generating ? 'Generating…' : '⚡ Generate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY MODAL (Ledger) */}
      {payEntry && (
        <div style={t.overlay} onClick={e => e.target===e.currentTarget && setPayEntry(null)}>
          <div style={{ ...t.modal, maxWidth:420 }}>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Record payment</h2>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:4 }}>
              <span style={{ fontWeight:600, color:'#0f172a' }}>{payEntry.learners?.first_name} {payEntry.learners?.last_name}</span>
              {payEntry.learners?.reference_no && (
                <span style={{ marginLeft:8, fontSize:11, background:'#f1f5f9', color:'#64748b', padding:'2px 8px', borderRadius:10, fontWeight:600, letterSpacing:'0.5px' }}>
                  #{payEntry.learners.reference_no}
                </span>
              )}
            </div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>{payEntry.description}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Total due</div>
                <div style={{ fontWeight:700, fontSize:16 }}>{sym}{Number(payEntry.amount_due).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Remaining</div>
                <div style={{ fontWeight:700, fontSize:16, color:'#dc2626' }}>
                  {sym}{(Number(payEntry.amount_due) - Number(payEntry.amount_paid)).toLocaleString()}
                </div>
              </div>
            </div>
            <form onSubmit={recordPay}>
              <label style={t.label}>Amount ({sym}) *</label>
              <input style={t.input} type="number" step="0.01" min="0.01"
                max={Number(payEntry.amount_due) - Number(payEntry.amount_paid)}
                value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} required />
              <label style={t.label}>Payment method</label>
              <select style={t.input} value={payForm.payment_method} onChange={e => setPayForm(f=>({...f,payment_method:e.target.value}))}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <label style={t.label}>Notes <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span></label>
              <input style={t.input} value={payForm.notes} onChange={e => setPayForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Cash received at front office" />
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setPayEntry(null)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={paying}>{paying ? 'Saving…' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL PAYMENT MODAL (Payments tab) */}
      {showPay && (
        <div style={t.overlay} onClick={e => e.target===e.currentTarget && setShowPay(false)}>
          <div style={t.modal}>
            <h2 style={{ fontSize:19, fontWeight:800, marginBottom:20 }}>Record payment</h2>
            <form onSubmit={savePay}>
              <label style={t.label}>Learner *</label>
              <select style={t.input} value={pf.learner_id} onChange={e => setPf(f=>({...f,learner_id:e.target.value}))} required>
                <option value="">Select learner…</option>
                {learners.map(l => <option key={l.id} value={l.id}>{l.reference_no ? `[${l.reference_no}] ` : ''}{l.first_name} {l.last_name}</option>)}
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={t.label}>Amount ({sym}) *</label><input style={t.input} type="number" value={pf.amount_paid} onChange={e => setPf(f=>({...f,amount_paid:e.target.value}))} required /></div>
                <div><label style={t.label}>Date *</label><input style={t.input} type="date" value={pf.payment_date} onChange={e => setPf(f=>({...f,payment_date:e.target.value}))} required /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={t.label}>Method</label>
                  <select style={t.input} value={pf.payment_method} onChange={e => setPf(f=>({...f,payment_method:e.target.value}))}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select></div>
                <div><label style={t.label}>Reference</label><input style={t.input} value={pf.reference} onChange={e => setPf(f=>({...f,reference:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShowPay(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
