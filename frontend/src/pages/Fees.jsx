import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as XLSX from 'xlsx'
import api from '../lib/api'

const STATUS_STYLE = {
  paid:    { bg: '#dcfce7', color: '#15803d' },
  partial: { bg: '#fef9c3', color: '#a16207' },
  overdue: { bg: '#fee2e2', color: '#dc2626' },
  pending: { bg: '#f1f5f9', color: '#64748b' },
}

const PAYMENT_METHODS = [
  { value: 'cash',         label: 'Cash' },
  { value: 'eft',          label: 'EFT / Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money (M-Pesa)' },
  { value: 'ewallet',      label: 'eWallet' },
  { value: 'snapscan',     label: 'SnapScan' },
  { value: 'other',        label: 'Other' },
]

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const t_input = {
  width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0',
  borderRadius:9, fontSize:14, outline:'none', marginBottom:14,
  background:'#fff', color:'#0f172a', transition:'border-color .15s'
}
const t_label = { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }
const t_th = { textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', background:'#f8fafc', textTransform:'uppercase', letterSpacing:'0.6px' }
const t_td = { padding:'12px 14px', fontSize:14, borderTop:'1px solid #f1f5f9', color:'#374151' }
const btn_primary = { padding:'9px 18px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:14 }
const btn_ghost   = { padding:'9px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:14 }
const overlay_s   = { position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }
const modal_s     = { background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }

function StatusBadge({ status }) {
  const c = STATUS_STYLE[status] || STATUS_STYLE.pending
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:c.bg, color:c.color }}>{status}</span>
}

function TrashBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Delete entry"
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, border:'1px solid #fca5a5', borderRadius:6, background:'#fff', color:'#dc2626', cursor:'pointer', flexShrink:0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  )
}

function exportToExcel(ledger, sym, schoolName, monthLabel) {
  const rows = ledger.map(r => ({
    'Ref':           r.learners?.reference_no || '—',
    'Learner':       `${r.learners?.first_name} ${r.learners?.last_name}`,
    'Grade':         `${r.learners?.classes?.grades?.name||''} ${r.learners?.classes?.name||''}`.trim() || '—',
    'Description':   r.description,
    'Due date':      r.due_date,
    [`Due (${sym})`]:     Number(r.amount_due),
    [`Paid (${sym})`]:    Number(r.amount_paid),
    [`Balance (${sym})`]: Number(r.amount_due) - Number(r.amount_paid),
    'Status':        r.status,
  }))
  // Totals row
  rows.push({
    'Ref': '', 'Learner': 'TOTAL', 'Grade': '', 'Description': '', 'Due date': '',
    [`Due (${sym})`]:     ledger.reduce((s,r) => s + Number(r.amount_due), 0),
    [`Paid (${sym})`]:    ledger.reduce((s,r) => s + Number(r.amount_paid), 0),
    [`Balance (${sym})`]: ledger.reduce((s,r) => s + Number(r.amount_due) - Number(r.amount_paid), 0),
    'Status': '',
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [8,22,12,28,12,12,12,12,10].map(w=>({wch:w}))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Ledger')
  XLSX.writeFile(wb, `${schoolName}_Fees_${monthLabel}.xlsx`)
}

export default function Fees() {
  const { school } = useAuth()
  const toast = useToast()
  const sym = school?.countries?.currency_symbol || 'R'
  const schoolName = school?.name || 'School'
  const year = new Date().getFullYear()

  const [ledger,       setLedger]       = useState([])
  const [summary,      setSummary]      = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [filter,       setFilter]       = useState({ status:'', month: new Date().toISOString().slice(0,7) })

  // Generate modal
  const [showGen,   setShowGen]   = useState(false)
  const [genForm,   setGenForm]   = useState({ frequency:'monthly', year, month:new Date().getMonth()+1, term:1, due_date:'' })
  const [generating, setGenerating] = useState(false)

  // Pay modal
  const [payEntry, setPayEntry] = useState(null)
  const [payForm,  setPayForm]  = useState({ amount:'', payment_method:'cash', notes:'' })
  const [paying,   setPaying]   = useState(false)

  const loadLedger = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filter.status) p.append('status', filter.status)
      if (filter.month)  p.append('month',  filter.month)
      const { data } = await api.get(`/fee-ledger?${p}`)
      setLedger(data)
    } catch { } finally { setLoading(false) }
  }

  const loadSummary = async () => {
    try { const { data } = await api.get(`/fee-ledger/summary?year=${year}`); setSummary(data) } catch { }
  }

  useEffect(() => { loadLedger(); loadSummary() }, [])
  useEffect(() => { loadLedger() }, [filter])

  // Monthly totals from current ledger view
  const monthDue       = ledger.reduce((s,r) => s + Number(r.amount_due), 0)
  const monthPaid      = ledger.reduce((s,r) => s + Number(r.amount_paid), 0)
  const monthBalance   = monthDue - monthPaid
  const monthCount     = ledger.length
  const overdueCount   = ledger.filter(r => r.status === 'overdue').length

  const generate = async e => {
    e.preventDefault(); setGenerating(true)
    try {
      const { data } = await api.post('/fee-ledger/generate', genForm)
      setShowGen(false)
      toast.success(`Generated ${data.created} entries · ${data.skipped} already existed`)
      loadLedger(); loadSummary()
    } catch (err) { toast.error(err.response?.data?.error || 'Generation failed') }
    finally { setGenerating(false) }
  }

  const deleteLedgerEntry = async id => {
    if (!confirm('Delete this fee entry? This cannot be undone.')) return
    try { await api.delete(`/fee-ledger/${id}`); toast.success('Entry deleted'); loadLedger(); loadSummary() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const openPay = entry => {
    const remaining = Number(entry.amount_due) - Number(entry.amount_paid)
    setPayForm({ amount: remaining.toFixed(2), payment_method: 'cash', notes: '' })
    setPayEntry(entry)
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

  const [m, y] = filter.month ? filter.month.split('-') : ['', year]
  const monthLabel = m ? `${MONTHS[parseInt(m,10)-1]} ${y}` : `${year}`

  return (
    <div>
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>Fees</h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>Fee ledger — track, collect and export</p>
        </div>
        <button style={btn_primary} onClick={() => setShowGen(true)}>⚡ Generate fees</button>
      </div>

      {/* Year summary cards */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:`Total due ${year}`,   value:`${sym}${summary.totalDue.toLocaleString()}`,    color:'#0f172a' },
            { label:`Collected ${year}`,   value:`${sym}${summary.totalPaid.toLocaleString()}`,   color:'#16a34a' },
            { label:`Outstanding ${year}`, value:`${sym}${summary.outstanding.toLocaleString()}`, color:'#1d4ed8' },
            { label:'Overdue entries',      value:summary.overdueCount,                           color:'#dc2626' },
          ].map(c => (
            <div key={c.label} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize:24, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={filter.month} onChange={e => setFilter(f=>({...f,month:e.target.value}))}
            style={{ padding:'8px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, background:'#fff', fontWeight:500 }}>
            {Array.from({length:12},(_,i) => {
              const mo = String(i+1).padStart(2,'0')
              return <option key={i} value={`${year}-${mo}`}>{MONTHS[i]} {year}</option>
            })}
          </select>
          <select value={filter.status} onChange={e => setFilter(f=>({...f,status:e.target.value}))}
            style={{ padding:'8px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, background:'#fff', fontWeight:500 }}>
            <option value="">All statuses</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          {overdueCount > 0 && (
            <span style={{ background:'#fee2e2', color:'#dc2626', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button onClick={() => { exportToExcel(ledger, sym, schoolName, monthLabel); toast.success(`Exported ${monthLabel} to Excel`) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#f0fdf4', color:'#15803d', border:'1px solid #86efac', borderRadius:9, fontWeight:600, fontSize:13, cursor:'pointer' }}>
          ⬇ Export {monthLabel}
        </button>
      </div>

      {/* Ledger table */}
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Ref','Learner','Grade','Description','Due date','Due','Paid','Balance','Status',''].map(h =>
                <th key={h} style={t_th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ ...t_td, textAlign:'center', color:'#94a3b8', padding:48 }}>Loading…</td></tr>
            )}

            {!loading && ledger.map(row => {
              const balance  = Number(row.amount_due) - Number(row.amount_paid)
              const isOverdue = row.status === 'overdue'
              return (
                <tr key={row.id} style={{ background: isOverdue ? '#fff9f9' : '' }}>
                  <td style={{ ...t_td, fontSize:11, color:'#94a3b8', fontWeight:700, letterSpacing:'0.5px' }}>
                    {row.learners?.reference_no || '—'}
                  </td>
                  <td style={{ ...t_td, fontWeight:600, color:'#0f172a' }}>
                    {row.learners?.first_name} {row.learners?.last_name}
                  </td>
                  <td style={t_td}>
                    {row.learners?.classes?.grades?.name || '—'}{' '}{row.learners?.classes?.name || ''}
                  </td>
                  <td style={t_td}>{row.description}</td>
                  <td style={{ ...t_td, fontSize:12, color: isOverdue ? '#dc2626' : '#64748b', whiteSpace:'nowrap' }}>
                    {new Date(row.due_date).toLocaleDateString('en-ZA')}
                    {isOverdue && <div style={{ fontSize:10, fontWeight:800, marginTop:2 }}>OVERDUE</div>}
                  </td>
                  <td style={t_td}>{sym}{Number(row.amount_due).toLocaleString()}</td>
                  <td style={{ ...t_td, color:'#16a34a', fontWeight:600 }}>{sym}{Number(row.amount_paid).toLocaleString()}</td>
                  <td style={{ ...t_td, fontWeight:700, color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                    {sym}{balance.toLocaleString()}
                  </td>
                  <td style={t_td}><StatusBadge status={row.status} /></td>
                  <td style={{ ...t_td }}>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {row.status !== 'paid' && (
                        <button onClick={() => openPay(row)}
                          style={{ ...btn_primary, padding:'5px 14px', fontSize:12 }}>
                          Pay
                        </button>
                      )}
                      <TrashBtn onClick={() => deleteLedgerEntry(row.id)} />
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Monthly totals footer row */}
            {!loading && ledger.length > 0 && (
              <tr style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                <td colSpan={5} style={{ ...t_td, fontWeight:700, color:'#0f172a', fontSize:13 }}>
                  {monthLabel} totals · {monthCount} entr{monthCount === 1 ? 'y' : 'ies'}
                </td>
                <td style={{ ...t_td, fontWeight:800, color:'#0f172a' }}>{sym}{monthDue.toLocaleString()}</td>
                <td style={{ ...t_td, fontWeight:800, color:'#16a34a' }}>{sym}{monthPaid.toLocaleString()}</td>
                <td style={{ ...t_td, fontWeight:800, color: monthBalance > 0 ? '#dc2626' : '#16a34a' }}>
                  {sym}{monthBalance.toLocaleString()}
                </td>
                <td colSpan={2} style={t_td}>
                  <span style={{ fontSize:12, color:'#64748b' }}>
                    {monthPaid > 0 ? `${Math.round(monthPaid/monthDue*100)}% collected` : '0% collected'}
                  </span>
                </td>
              </tr>
            )}

            {!loading && ledger.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...t_td, textAlign:'center', color:'#94a3b8', padding:56 }}>
                  <div style={{ fontSize:24, marginBottom:10 }}>📋</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>No entries for {monthLabel}</div>
                  <div style={{ fontSize:13 }}>Click <strong>Generate fees</strong> to create entries from your fee plans.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* GENERATE FEES MODAL */}
      {showGen && (
        <div style={overlay_s} onClick={e => e.target===e.currentTarget && setShowGen(false)}>
          <div style={modal_s}>
            <h2 style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>Generate fees</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
              Creates one entry per eligible learner from active fee plans. Already-existing entries are skipped automatically.
            </p>
            <form onSubmit={generate}>
              <label style={t_label}>Frequency</label>
              <select style={t_input} value={genForm.frequency} onChange={e => setGenForm(f=>({...f,frequency:e.target.value}))}>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={t_label}>Year *</label>
                  <input style={t_input} type="number" value={genForm.year} onChange={e => setGenForm(f=>({...f,year:Number(e.target.value)}))} required />
                </div>
                {genForm.frequency === 'monthly' ? (
                  <div>
                    <label style={t_label}>Month *</label>
                    <select style={t_input} value={genForm.month} onChange={e => setGenForm(f=>({...f,month:Number(e.target.value)}))}>
                      {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={t_label}>Term *</label>
                    <select style={t_input} value={genForm.term} onChange={e => setGenForm(f=>({...f,term:Number(e.target.value)}))}>
                      {[1,2,3,4].map(n => <option key={n} value={n}>Term {n}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <label style={t_label}>Override due date <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional — uses fee plan default if blank)</span></label>
              <input style={t_input} type="date" value={genForm.due_date} onChange={e => setGenForm(f=>({...f,due_date:e.target.value}))} />
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#78350f' }}>
                ⚠ Make sure Fee Plans are set up in Settings → Fee Plans first.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" style={btn_ghost} onClick={() => setShowGen(false)}>Cancel</button>
                <button type="submit" style={btn_primary} disabled={generating}>{generating ? 'Generating…' : '⚡ Generate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY MODAL */}
      {payEntry && (
        <div style={overlay_s} onClick={e => e.target===e.currentTarget && setPayEntry(null)}>
          <div style={{ ...modal_s, maxWidth:400 }}>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Record payment</h2>
            <div style={{ marginBottom:16 }}>
              <span style={{ fontWeight:600, color:'#0f172a', fontSize:15 }}>
                {payEntry.learners?.first_name} {payEntry.learners?.last_name}
              </span>
              {payEntry.learners?.reference_no && (
                <span style={{ marginLeft:8, fontSize:11, background:'#f1f5f9', color:'#64748b', padding:'2px 8px', borderRadius:10, fontWeight:700, letterSpacing:'0.5px' }}>
                  #{payEntry.learners.reference_no}
                </span>
              )}
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:3 }}>{payEntry.description}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18, padding:'12px 14px', background:'#f8fafc', borderRadius:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Total due</div>
                <div style={{ fontWeight:700, fontSize:18 }}>{sym}{Number(payEntry.amount_due).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Remaining</div>
                <div style={{ fontWeight:700, fontSize:18, color:'#dc2626' }}>
                  {sym}{(Number(payEntry.amount_due) - Number(payEntry.amount_paid)).toLocaleString()}
                </div>
              </div>
            </div>
            <form onSubmit={recordPay}>
              <label style={t_label}>Amount ({sym}) *</label>
              <input style={t_input} type="number" step="0.01" min="0.01"
                max={Number(payEntry.amount_due) - Number(payEntry.amount_paid)}
                value={payForm.amount}
                onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} required />
              <label style={t_label}>Payment method</label>
              <select style={t_input} value={payForm.payment_method} onChange={e => setPayForm(f=>({...f,payment_method:e.target.value}))}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <label style={t_label}>Notes <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span></label>
              <input style={t_input} value={payForm.notes}
                onChange={e => setPayForm(f=>({...f,notes:e.target.value}))}
                placeholder="e.g. Cash received at front office" />
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
                <button type="button" style={btn_ghost} onClick={() => setPayEntry(null)}>Cancel</button>
                <button type="submit" style={btn_primary} disabled={paying}>{paying ? 'Saving…' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
