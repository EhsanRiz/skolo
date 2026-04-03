import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as XLSX from 'xlsx'
import api from '../lib/api'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const PAYMENT_METHODS = [
  { value: 'cash',         label: 'Cash' },
  { value: 'eft',          label: 'EFT / Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money (M-Pesa)' },
  { value: 'ewallet',      label: 'eWallet' },
  { value: 'snapscan',     label: 'SnapScan' },
  { value: 'other',        label: 'Other' },
]

const STATUS_STYLE = {
  paid:    { bg: '#dcfce7', color: '#15803d' },
  partial: { bg: '#fef9c3', color: '#a16207' },
  overdue: { bg: '#fee2e2', color: '#dc2626' },
  pending: { bg: '#f1f5f9', color: '#64748b' },
}

const CSS = `
@keyframes slideDown {
  from { opacity:0; transform:translateY(-6px); }
  to   { opacity:1; transform:translateY(0); }
}
.grade-rows { animation: slideDown 0.18s ease both; }
.fee-row:hover { background: #fafafa !important; }
.pay-btn { transition: background 0.12s, transform 0.08s; }
.pay-btn:hover { background: #1a3a6b !important; transform: translateY(-1px); }
.pay-btn:active { transform: translateY(0); }
`

function StatusPill({ status }) {
  const c = STATUS_STYLE[status] || STATUS_STYLE.pending
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20,
      fontSize:11, fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      {status}
    </span>
  )
}

function TrashBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Delete"
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:26, height:26, border:'1px solid #fca5a5', borderRadius:6,
        background:'#fff', color:'#dc2626', cursor:'pointer', flexShrink:0 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>
    </button>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.18s', flexShrink:0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
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
  const totalDue     = ledger.reduce((s,r)=>s+Number(r.amount_due),0)
  const totalPaid    = ledger.reduce((s,r)=>s+Number(r.amount_paid),0)
  rows.push({ 'Ref':'', 'Learner':'TOTAL', 'Grade':'', 'Description':'', 'Due date':'',
    [`Due (${sym})`]: totalDue, [`Paid (${sym})`]: totalPaid,
    [`Balance (${sym})`]: totalDue - totalPaid, 'Status':'' })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [8,22,12,28,12,12,12,12,10].map(w=>({wch:w}))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Ledger')
  XLSX.writeFile(wb, `${schoolName}_Fees_${monthLabel}.xlsx`)
}

export default function Fees() {
  const { school } = useAuth()
  const toast = useToast()
  const sym   = school?.countries?.currency_symbol || 'R'
  const schoolName = school?.name || 'School'
  const year  = new Date().getFullYear()

  const [ledger,    setLedger]    = useState([])
  const [summary,   setSummary]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [month,     setMonth]     = useState(new Date().toISOString().slice(0,7))
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState('unpaid') // 'all'|'overdue'|'partial'|'unpaid'|'paid'
  const [expanded,  setExpanded]  = useState({}) // grade name → bool
  const searchRef = useRef()

  // Generate modal
  const [showGen,    setShowGen]    = useState(false)
  const [genForm,    setGenForm]    = useState({ frequency:'monthly', year, month:new Date().getMonth()+1, term:1, due_date:'' })
  const [generating, setGenerating] = useState(false)

  // Pay modal
  const [payEntry, setPayEntry] = useState(null)
  const [payForm,  setPayForm]  = useState({ amount:'', payment_method:'cash', notes:'' })
  const [paying,   setPaying]   = useState(false)

  const loadLedger = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.append('month', month)
      const { data } = await api.get(`/fee-ledger?${p}`)
      setLedger(data)
      // Auto-expand grades with overdue entries
      const autoExpand = {}
      data.forEach(r => {
        const gname = r.learners?.classes?.grades?.name || 'Unassigned'
        if (r.status === 'overdue') autoExpand[gname] = true
      })
      setExpanded(prev => ({ ...autoExpand, ...prev }))
    } catch { } finally { setLoading(false) }
  }

  const loadSummary = async () => {
    try { const { data } = await api.get(`/fee-ledger/summary?year=${year}`); setSummary(data) } catch { }
  }

  useEffect(() => { loadLedger(); loadSummary() }, [])
  useEffect(() => { loadLedger() }, [month])

  // Compute filtered + grouped ledger
  const processed = useMemo(() => {
    let rows = [...ledger]

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(r => {
        const name = `${r.learners?.first_name} ${r.learners?.last_name}`.toLowerCase()
        const ref  = (r.learners?.reference_no || '').toLowerCase()
        return name.includes(q) || ref.includes(q)
      })
      return { isSearch: true, rows }
    }

    // Status pill filter
    if (statusFilter === 'unpaid') {
      rows = rows.filter(r => r.status !== 'paid')
    } else if (statusFilter === 'overdue') {
      rows = rows.filter(r => r.status === 'overdue')
    } else if (statusFilter === 'partial') {
      rows = rows.filter(r => r.status === 'partial')
    } else if (statusFilter === 'paid') {
      rows = rows.filter(r => r.status === 'paid')
    }
    // 'all' → show everything, no additional filter

    // Group by grade
    const groups = {}
    rows.forEach(r => {
      const gname = r.learners?.classes?.grades?.name || 'Unassigned'
      if (!groups[gname]) groups[gname] = []
      groups[gname].push(r)
    })

    return { isSearch: false, groups }
  }, [ledger, search, statusFilter])

  // Status pill counts
  const counts = useMemo(() => ({
    all:     ledger.length,
    overdue: ledger.filter(r=>r.status==='overdue').length,
    partial: ledger.filter(r=>r.status==='partial').length,
    unpaid:  ledger.filter(r=>r.status!=='paid').length,
    paid:    ledger.filter(r=>r.status==='paid').length,
  }), [ledger])

  // Filtered totals — reflect the current status pill selection
  const filteredRows = useMemo(() => {
    if (search.trim()) return []
    if (statusFilter === 'unpaid')  return ledger.filter(r=>r.status!=='paid')
    if (statusFilter === 'overdue') return ledger.filter(r=>r.status==='overdue')
    if (statusFilter === 'partial') return ledger.filter(r=>r.status==='partial')
    if (statusFilter === 'paid')    return ledger.filter(r=>r.status==='paid')
    return ledger // 'all'
  }, [ledger, statusFilter, search])

  const monthDue     = filteredRows.reduce((s,r)=>s+Number(r.amount_due),0)
  const monthPaid    = filteredRows.reduce((s,r)=>s+Number(r.amount_paid),0)
  const monthBalance = monthDue - monthPaid
  const pct = monthDue > 0 ? Math.round(monthPaid/monthDue*100) : 0
  // Always use full ledger for collection rate context
  const fullDue  = ledger.reduce((s,r)=>s+Number(r.amount_due),0)
  const fullPaid = ledger.reduce((s,r)=>s+Number(r.amount_paid),0)
  const fullPct  = fullDue > 0 ? Math.round(fullPaid/fullDue*100) : 0

  const [my, mm] = month.split('-')
  const monthLabel = `${MONTHS[parseInt(mm,10)-1]} ${my}`

  const toggleGrade = gname => setExpanded(e => ({ ...e, [gname]: !e[gname] }))
  const expandAll   = () => {
    const all = {}
    Object.keys(processed.groups || {}).forEach(g => all[g] = true)
    setExpanded(all)
  }
  const collapseAll = () => setExpanded({})

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

  const deleteLedger = async id => {
    if (!confirm('Delete this fee entry?')) return
    try { await api.delete(`/fee-ledger/${id}`); toast.success('Entry deleted'); loadLedger(); loadSummary() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

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

  const FeeRow = ({ row }) => {
    const balance = Number(row.amount_due) - Number(row.amount_paid)
    return (
      <tr className="fee-row" style={{ background: row.status==='overdue' ? '#fff9f9' : '#fff' }}>
        <td style={{ padding:'10px 16px 10px 40px', fontSize:11, color:'#94a3b8', fontWeight:700, letterSpacing:'0.5px', width:70 }}>
          {row.learners?.reference_no || '—'}
        </td>
        <td style={{ padding:'10px 8px', fontWeight:600, color:'#0f172a', fontSize:14 }}>
          {row.learners?.first_name} {row.learners?.last_name}
        </td>
        <td style={{ padding:'10px 8px', fontSize:13, color:'#64748b' }}>{row.description}</td>
        <td style={{ padding:'10px 8px', fontSize:12, color: row.status==='overdue' ? '#dc2626' : '#64748b', whiteSpace:'nowrap' }}>
          {new Date(row.due_date).toLocaleDateString('en-ZA')}
          {row.status==='overdue' && <div style={{ fontSize:10, fontWeight:800 }}>OVERDUE</div>}
        </td>
        <td style={{ padding:'10px 8px', fontSize:13 }}>{sym}{Number(row.amount_due).toLocaleString()}</td>
        <td style={{ padding:'10px 8px', fontSize:13, color:'#16a34a', fontWeight:600 }}>{sym}{Number(row.amount_paid).toLocaleString()}</td>
        <td style={{ padding:'10px 8px', fontSize:13, fontWeight:700, color: balance>0?'#dc2626':'#16a34a' }}>
          {sym}{balance.toLocaleString()}
        </td>
        <td style={{ padding:'10px 8px' }}><StatusPill status={row.status} /></td>
        <td style={{ padding:'10px 16px 10px 8px' }}>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            {row.status !== 'paid' && (
              <button className="pay-btn" onClick={() => openPay(row)}
                style={{ padding:'5px 14px', background:'#0f2044', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Pay
              </button>
            )}
            <TrashBtn onClick={() => deleteLedger(row.id)} />
          </div>
        </td>
      </tr>
    )
  }

  const GradeGroup = ({ gname, rows }) => {
    const isOpen      = !!expanded[gname]
    const gradeOwed   = rows.reduce((s,r)=>s+Number(r.amount_due),0)
    const gradePaid   = rows.reduce((s,r)=>s+Number(r.amount_paid),0)
    const gradeBalance= gradeOwed - gradePaid
    const allPaid     = rows.every(r=>r.status==='paid')
    const hasOverdue  = rows.some(r=>r.status==='overdue')
    const unpaidCount = rows.filter(r=>r.status!=='paid').length

    return (
      <div style={{ marginBottom:8 }}>
        {/* Grade header */}
        <div onClick={() => toggleGrade(gname)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
            background: hasOverdue ? '#fff5f5' : allPaid ? '#f0fdf4' : '#f8fafc',
            borderRadius: isOpen ? '10px 10px 0 0' : 10,
            border: `1px solid ${hasOverdue ? '#fca5a5' : allPaid ? '#86efac' : '#e2e8f0'}`,
            cursor:'pointer', userSelect:'none', transition:'background 0.15s' }}>
          <ChevronIcon open={isOpen} />
          <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', flex:1 }}>{gname}</div>
          {allPaid && <span style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>✓ All paid</span>}
          {!allPaid && (
            <span style={{ fontSize:12, color:'#64748b' }}>
              {unpaidCount} unpaid ·{' '}
              <span style={{ fontWeight:700, color: hasOverdue?'#dc2626':'#374151' }}>
                {sym}{gradeBalance.toLocaleString()} outstanding
              </span>
            </span>
          )}
          <div style={{ fontSize:12, color:'#94a3b8', marginLeft:8 }}>
            {sym}{gradeOwed.toLocaleString()} due · {sym}{gradePaid.toLocaleString()} paid
          </div>
          {hasOverdue && (
            <span style={{ fontSize:11, fontWeight:700, color:'#dc2626',
              background:'#fee2e2', padding:'2px 8px', borderRadius:20 }}>
              ⚠ overdue
            </span>
          )}
        </div>

        {/* Grade rows */}
        {isOpen && (
          <div className="grade-rows" style={{ border:'1px solid #e2e8f0', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Ref','Learner','Description','Due date','Due','Paid','Balance','Status',''].map(h =>
                    <th key={h} style={{ textAlign:'left', padding: h==='Ref'?'8px 8px 8px 40px':'8px', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => <FeeRow key={row.id} row={row} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>Fees</h1>
            <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>Fee collection — {monthLabel}</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { exportToExcel(ledger, sym, schoolName, monthLabel); toast.success(`Exported ${monthLabel}`) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'#f0fdf4', color:'#15803d', border:'1px solid #86efac', borderRadius:9, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              ⬇ Export
            </button>
            <button onClick={() => setShowGen(true)}
              style={{ padding:'9px 18px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:14 }}>
              ⚡ Generate fees
            </button>
          </div>
        </div>

        {/* Big search bar */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by learner name or reference number…"
            style={{ width:'100%', padding:'12px 16px 12px 42px', border:'1.5px solid #e2e8f0', borderRadius:10,
              fontSize:15, outline:'none', boxSizing:'border-box', background:'#fff',
              boxShadow:'0 1px 3px rgba(0,0,0,.06)', transition:'border-color .15s' }}
            onFocus={e => e.target.style.borderColor='#0f2044'}
            onBlur={e => e.target.style.borderColor='#e2e8f0'}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:18 }}>✕</button>
          )}
        </div>

        {/* Controls row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Month picker */}
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{ padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff', fontWeight:500 }}>
              {Array.from({length:12},(_,i) => {
                const mo = String(i+1).padStart(2,'0')
                return <option key={i} value={`${year}-${mo}`}>{MONTHS[i]} {year}</option>
              })}
            </select>

            {/* Status pills */}
            {[
              { key:'unpaid', label:`Unpaid (${counts.unpaid})` },
              { key:'overdue', label:`Overdue (${counts.overdue})` },
              { key:'partial', label:`Partial (${counts.partial})` },
              { key:'paid',   label:`Paid (${counts.paid})` },
              { key:'all',    label:`All (${counts.all})` },
            ].map(p => (
              <button key={p.key} onClick={() => setStatusFilter(p.key)}
                style={{ padding:'5px 13px', borderRadius:20, border:'1.5px solid',
                  borderColor: statusFilter===p.key ? '#0f2044' : '#e2e8f0',
                  background:  statusFilter===p.key ? '#0f2044' : '#fff',
                  color:       statusFilter===p.key ? '#fff' : '#64748b',
                  fontWeight:600, fontSize:12, cursor:'pointer', transition:'all .15s',
                  ...(p.key==='overdue' && counts.overdue>0 && statusFilter!==p.key ? { borderColor:'#fca5a5', color:'#dc2626' } : {})
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Expand/collapse + show paid */}
          {!search && processed.groups && (
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={expandAll}   style={{ fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer' }}>Expand all</button>
              <button onClick={collapseAll} style={{ fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer' }}>Collapse all</button>
            </div>
          )}
        </div>

        {/* Summary bar — always visible, reflects current filter */}
        {!loading && (
          <div style={{ display:'flex', gap:0, marginBottom:16, background:'#fff', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #e2e8f0' }}>
            {[
              { label: statusFilter==='all' ? 'Total due' : `${statusFilter.charAt(0).toUpperCase()+statusFilter.slice(1)} — due`,
                value:`${sym}${monthDue.toLocaleString()}`, color:'#0f172a' },
              { label:'Collected',   value:`${sym}${monthPaid.toLocaleString()}`,    color:'#16a34a' },
              { label:'Outstanding', value:`${sym}${monthBalance.toLocaleString()}`, color: monthBalance>0?'#dc2626':'#16a34a' },
              { label:'Collection rate (month)', value:`${fullPct}%`,               color: fullPct>=80?'#16a34a':fullPct>=50?'#ca8a04':'#dc2626' },
            ].map((c, i) => (
              <div key={c.label} style={{ flex:1, padding:'12px 20px', borderLeft: i>0?'1px solid #f1f5f9':'none' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:c.color }}>
                  {ledger.length===0 ? <span style={{color:'#94a3b8',fontSize:14}}>No entries</span> : c.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH RESULTS — flat list */}
        {search && processed.isSearch && (
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
            {processed.rows.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:20, marginBottom:8 }}>🔍</div>
                No results for "<strong>{search}</strong>"
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Ref','Learner','Description','Due date','Due','Paid','Balance','Status',''].map(h =>
                      <th key={h} style={{ textAlign:'left', padding:'10px 8px', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid #e2e8f0', ...(h==='Ref'?{paddingLeft:16}:{}) }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {processed.rows.map(row => <FeeRow key={row.id} row={row} />)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* GRADE GROUPS */}
        {!search && !loading && (
          <>
            {processed.groups && Object.keys(processed.groups).length > 0
              ? Object.entries(processed.groups).map(([gname, rows]) => (
                  <GradeGroup key={gname} gname={gname} rows={rows} />
                ))
              : (
                <div style={{ background:'#fff', borderRadius:12, padding:56, textAlign:'center', color:'#94a3b8', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:24, marginBottom:10 }}>
                    {statusFilter==='paid' ? '🎉' : '📋'}
                  </div>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:4, color:'#374151' }}>
                    {statusFilter==='unpaid' && ledger.length > 0 ? 'All fees paid for this month!' :
                     statusFilter==='overdue' && counts.overdue===0 ? 'No overdue entries' :
                     'No entries for this period'}
                  </div>
                  <div style={{ fontSize:13 }}>
                    {ledger.length === 0 ? <>Click <strong>⚡ Generate fees</strong> to create entries from your fee plans.</> : ''}
                  </div>
                </div>
              )
            }
          </>
        )}

        {loading && (
          <div style={{ background:'#fff', borderRadius:12, padding:48, textAlign:'center', color:'#94a3b8', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            Loading…
          </div>
        )}

        {/* GENERATE FEES MODAL */}
        {showGen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }}
            onClick={e => e.target===e.currentTarget && setShowGen(false)}>
            <div style={{ background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:440, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>Generate fees</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
                Creates one entry per eligible learner from active fee plans. Existing entries are skipped.
              </p>
              <form onSubmit={generate}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Frequency</label>
                <select style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                  value={genForm.frequency} onChange={e => setGenForm(f=>({...f,frequency:e.target.value}))}>
                  <option value="monthly">Monthly</option>
                  <option value="termly">Termly</option>
                </select>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Year *</label>
                    <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                      type="number" value={genForm.year} onChange={e => setGenForm(f=>({...f,year:Number(e.target.value)}))} required />
                  </div>
                  {genForm.frequency==='monthly' ? (
                    <div>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Month *</label>
                      <select style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                        value={genForm.month} onChange={e => setGenForm(f=>({...f,month:Number(e.target.value)}))}>
                        {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Term *</label>
                      <select style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                        value={genForm.term} onChange={e => setGenForm(f=>({...f,term:Number(e.target.value)}))}>
                        {[1,2,3,4].map(n => <option key={n} value={n}>Term {n}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Override due date <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
                </label>
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                  type="date" value={genForm.due_date} onChange={e => setGenForm(f=>({...f,due_date:e.target.value}))} />
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#78350f' }}>
                  ⚠ Set up Fee Plans in Settings → Fee Plans first.
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => setShowGen(false)}
                    style={{ padding:'9px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={generating}
                    style={{ padding:'9px 18px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor:generating?'not-allowed':'pointer' }}>
                    {generating ? 'Generating…' : '⚡ Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PAY MODAL */}
        {payEntry && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }}
            onClick={e => e.target===e.currentTarget && setPayEntry(null)}>
            <div style={{ background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Record payment</h2>
              <div style={{ marginBottom:16 }}>
                <span style={{ fontWeight:700, color:'#0f172a', fontSize:15 }}>
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
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Total due</div>
                  <div style={{ fontWeight:800, fontSize:20 }}>{sym}{Number(payEntry.amount_due).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>Remaining</div>
                  <div style={{ fontWeight:800, fontSize:20, color:'#dc2626' }}>
                    {sym}{(Number(payEntry.amount_due)-Number(payEntry.amount_paid)).toLocaleString()}
                  </div>
                </div>
              </div>
              <form onSubmit={recordPay}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Amount ({sym}) *</label>
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                  type="number" step="0.01" min="0.01"
                  max={Number(payEntry.amount_due)-Number(payEntry.amount_paid)}
                  value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} required />
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Payment method</label>
                <select style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:14, background:'#fff' }}
                  value={payForm.payment_method} onChange={e => setPayForm(f=>({...f,payment_method:e.target.value}))}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Notes <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
                </label>
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:16, background:'#fff' }}
                  value={payForm.notes} onChange={e => setPayForm(f=>({...f,notes:e.target.value}))}
                  placeholder="e.g. Cash received at front office" />
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => setPayEntry(null)}
                    style={{ padding:'9px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={paying}
                    style={{ padding:'9px 18px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor:paying?'not-allowed':'pointer' }}>
                    {paying ? 'Saving…' : 'Record payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
