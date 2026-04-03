import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as XLSX from 'xlsx'
import api from '../lib/api'

// Open receipt in a new printable window
function printReceipt(entry, schoolName, sym, schoolLogoUrl) {
  const learner    = entry.learners
  const amtDue     = Number(entry.amount_due)
  const amtPaid    = Number(entry.amount_paid)
  const balance    = amtDue - amtPaid
  const isPaid     = amtPaid >= amtDue
  const receiptNo  = 'REC-' + new Date().getFullYear() + '-' + entry.id.slice(-6).toUpperCase()
  const today      = new Date().toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'})
  const grade      = [learner?.classes?.grades?.name, learner?.classes?.name].filter(Boolean).join(' ') || '—'
  const methodMap  = { cash:'Cash', eft:'EFT / Bank Transfer', mobile_money:'Mobile Money (M-Pesa)', ewallet:'eWallet', snapscan:'SnapScan', other:'Other' }
  const method     = entry.notes?.split('|')[0]?.replace('method:','').trim() || 'cash'
  const methodLabel = methodMap[method] || 'Cash'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt ${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;padding:0}
  @media print{
    body{padding:0}
    .no-print{display:none!important}
    @page{size:A5;margin:8mm}
  }
  .receipt{max-width:420px;margin:0 auto;background:#fff}
  .header{background:#0f2044;color:#fff;padding:24px 28px 20px;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-size:22px;font-weight:900;letter-spacing:-0.5px}
  .brand-tag{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px}
  .school-logo{height:44px;max-width:120px;object-fit:contain;background:rgba(255,255,255,0.1);border-radius:6px;padding:4px}
  .receipt-label{text-align:right;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.8px}
  .receipt-no{font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px}
  .school-row{padding:14px 28px;border-bottom:1px solid #f1f5f9}
  .school-name{font-size:14px;font-weight:800;color:#0f172a}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:16px 28px;border-bottom:1px solid #f1f5f9}
  .info-block{margin-bottom:14px}
  .info-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px}
  .info-value{font-size:13px;font-weight:600;color:#0f172a}
  .desc-box{margin:0 28px 16px;background:#f8fafc;border-radius:8px;padding:12px 14px}
  .desc-text{font-size:13px;font-weight:700;color:#0f172a}
  .amounts{border-top:1px solid #f1f5f9}
  .amount-row{display:flex;justify-content:space-between;align-items:center;padding:10px 28px;border-bottom:1px solid #f8fafc}
  .amount-row:nth-child(2){background:#f8fafc}
  .amount-label{font-size:12px;color:#64748b}
  .amount-value{font-size:14px;font-weight:700;color:#0f172a}
  .amount-value.paid{color:#15803d}
  .amount-value.balance{color:${balance>0?'#dc2626':'#15803d'}}
  .stamp{margin:16px 28px;padding:10px 14px;border-radius:8px;text-align:center;font-size:15px;font-weight:900;letter-spacing:1px;border:2.5px solid ${isPaid?'#16a34a':'#dc2626'};color:${isPaid?'#15803d':'#dc2626'}}
  .method-row{padding:12px 28px;font-size:12px;color:#64748b;border-top:1px solid #f1f5f9}
  .footer{background:#f8fafc;padding:14px 28px;margin-top:8px}
  .footer-text{font-size:10px;color:#94a3b8;text-align:center;line-height:1.6}
  .print-bar{background:#0f2044;padding:12px 20px;display:flex;gap:10px;justify-content:center;position:sticky;top:0;z-index:10}
  .print-btn{padding:8px 20px;background:#fff;color:#0f2044;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer}
  .close-btn{padding:8px 20px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
</style>
</head>
<body>
<div class="no-print print-bar">
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  <button class="close-btn" onclick="window.close()">Close</button>
</div>
<div class="receipt">
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="${schoolName}" class="school-logo"/>` : ''}
      <div>
        <div class="brand">Skolo</div>
        <div class="brand-tag">One platform. Whole school.</div>
      </div>
    </div>
    <div>
      <div class="receipt-label">Payment Receipt</div>
      <div class="receipt-no">${receiptNo}</div>
    </div>
  </div>

  <div class="school-row">
    <div class="school-name">${schoolName}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">${today}</div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">Learner</div>
      <div class="info-value">${learner?.first_name} ${learner?.last_name}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Reference No.</div>
      <div class="info-value">${learner?.reference_no || '—'}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Grade / Class</div>
      <div class="info-value">${grade}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Payment method</div>
      <div class="info-value">${methodLabel}</div>
    </div>
  </div>

  <div class="desc-box">
    <div class="desc-text">${entry.description}</div>
  </div>

  <div class="amounts">
    <div class="amount-row">
      <div class="amount-label">Amount due</div>
      <div class="amount-value">${sym}${amtDue.toLocaleString('en-ZA',{minimumFractionDigits:2})}</div>
    </div>
    <div class="amount-row">
      <div class="amount-label">Amount paid</div>
      <div class="amount-value paid">${sym}${amtPaid.toLocaleString('en-ZA',{minimumFractionDigits:2})}</div>
    </div>
    <div class="amount-row">
      <div class="amount-label">Balance remaining</div>
      <div class="amount-value balance">${sym}${balance.toLocaleString('en-ZA',{minimumFractionDigits:2})}</div>
    </div>
  </div>

  <div class="stamp">${isPaid ? '✓ PAID IN FULL' : `BALANCE: ${sym}${balance.toFixed(2)}`}</div>

  <div class="footer">
    <div class="footer-text">
      This is an official payment receipt issued by ${schoolName}.<br/>
      Generated by Skolo · Please retain for your records.
    </div>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=520,height=700')
  win.document.write(html)
  win.document.close()
}

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

function ReceiptIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
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

  // Generate modal — two step: configure → preview → confirm
  const [showGen,     setShowGen]     = useState(false)
  const [genForm,     setGenForm]     = useState({ frequency:'monthly', year, month:new Date().getMonth()+1, term:1, due_date:'' })
  const [preview,     setPreview]     = useState(null)   // null | preview data
  const [previewing,  setPreviewing]  = useState(false)
  const [generating,  setGenerating]  = useState(false)

  // Pay modal
  const [payEntry, setPayEntry] = useState(null)
  const [payForm,  setPayForm]  = useState({ amount:'', payment_method:'cash', notes:'' })
  const [paying,   setPaying]   = useState(false)

  const [autoGenMsg, setAutoGenMsg] = useState('')

  const autoGenerate = async () => {
    try {
      const { data } = await api.post('/fee-ledger/auto-generate')
      if (data.created > 0) {
        setAutoGenMsg(`✓ ${data.created} fee entr${data.created>1?'ies':'y'} auto-generated`)
        setTimeout(() => setAutoGenMsg(''), 6000)
      }
    } catch { /* silent fail */ }
  }

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

  useEffect(() => { autoGenerate().then(() => { loadLedger(); loadSummary() }) }, [])
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
      await api.post(`/fee-ledger/${entryId}/pay`, payForm)
      setPayEntry(null); loadLedger(); loadSummary()
      // Small delay so ledger reloads with updated data before printing
      toast.success('Payment recorded — click the receipt icon to print')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setPaying(false) }
  }

  const deleteLedger = async id => {
    if (!confirm('Delete this fee entry?')) return
    try { await api.delete(`/fee-ledger/${id}`); toast.success('Entry deleted'); loadLedger(); loadSummary() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const fetchPreview = async e => {
    e.preventDefault(); setPreviewing(true)
    try {
      const p = new URLSearchParams({ frequency: genForm.frequency, year: genForm.year })
      if (genForm.frequency === 'monthly') p.append('month', genForm.month)
      else p.append('term', genForm.term)
      const { data } = await api.get(`/fee-ledger/preview?${p}`)
      setPreview(data)
    } catch (err) { toast.error('Could not fetch preview') }
    finally { setPreviewing(false) }
  }

  const confirmGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post('/fee-ledger/generate', genForm)
      setShowGen(false); setPreview(null)
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
            {Number(row.amount_paid) > 0 && (
              <button onClick={() => printReceipt(row, schoolName, sym, school?.logo_url)}
                title="Print / view receipt"
                style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:26, height:26, border:'1px solid #bfdbfe', borderRadius:6,
                  background:'#eff6ff', color:'#1d4ed8', cursor:'pointer', flexShrink:0 }}>
                <ReceiptIcon />
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
            <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>
              Fee collection — {monthLabel} · <span style={{ color:'#16a34a', fontSize:13 }}>Auto-managed</span>
              {autoGenMsg && <span style={{ marginLeft:12, fontSize:12, color:'#16a34a', fontWeight:700 }}>{autoGenMsg}</span>}
            </p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { exportToExcel(ledger, sym, schoolName, monthLabel); toast.success(`Exported ${monthLabel}`) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'#f0fdf4', color:'#15803d', border:'1px solid #86efac', borderRadius:9, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              ⬇ Export
            </button>
            <button onClick={() => setShowGen(true)}
              title="Manually generate fees for past/future periods or termly fees"
              style={{ padding:'7px 14px', background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:12 }}>
              ⚙ Manual
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
                    {ledger.length === 0 ? <>Fees are auto-generated. Check that fee plans exist in Settings → Fee Plans.</> : ''}
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

        {/* GENERATE FEES MODAL — Step 1: configure */}
        {showGen && !preview && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }}
            onClick={e => e.target===e.currentTarget && setShowGen(false)}>
            <div style={{ background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:440, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>Generate fees</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Choose the period — we'll show you exactly what will be created before anything happens.</p>
              <form onSubmit={fetchPreview}>
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
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:16, background:'#fff' }}
                  type="date" value={genForm.due_date} onChange={e => setGenForm(f=>({...f,due_date:e.target.value}))} />
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => setShowGen(false)}
                    style={{ padding:'9px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                  <button type="submit" disabled={previewing}
                    style={{ padding:'9px 18px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor:'pointer' }}>
                    {previewing ? 'Loading…' : 'Preview →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* GENERATE FEES MODAL — Step 2: preview + confirm */}
        {showGen && preview && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }}
            onClick={e => e.target===e.currentTarget && (setShowGen(false), setPreview(null))}>
            <div style={{ background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:580, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <h2 style={{ fontSize:19, fontWeight:800 }}>
                  Preview — {MONTHS[(genForm.month||1)-1]} {genForm.year}
                </h2>
                <button onClick={() => setPreview(null)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:13, fontWeight:600 }}>← Back</button>
              </div>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Review before confirming. Nothing has been created yet.</p>

              {!preview.has_plans && (
                <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13, color:'#c2410c' }}>
                  ⚠ No active fee plans found. Go to <strong>Settings → Fee Plans</strong> to create one first.
                </div>
              )}

              {preview.rows.length > 0 && (
                <div style={{ marginBottom:16, borderRadius:10, overflow:'hidden', border:'1px solid #e2e8f0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc' }}>
                        {['Grade','Fee plan','Per learner','Learners','New entries','Already done'].map(h=>
                          <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r,i)=>(
                        <tr key={i} style={{ borderTop:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'10px 12px', fontWeight:600, color:'#0f172a' }}>{r.grade_name}</td>
                          <td style={{ padding:'10px 12px', color:'#374151' }}>{r.plan_name}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>{sym}{Number(r.amount).toLocaleString()}</td>
                          <td style={{ padding:'10px 12px', color:'#64748b' }}>{r.learner_count}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ fontWeight:800, color: r.to_create>0?'#0f2044':'#94a3b8', fontSize:14 }}>{r.to_create}</span>
                            {r.to_create > 0 && <span style={{ fontSize:11, color:'#64748b', marginLeft:4 }}>({sym}{Number(r.total_amount).toLocaleString()})</span>}
                          </td>
                          <td style={{ padding:'10px 12px', color:'#16a34a', fontWeight:600 }}>{r.already_done>0?`✓ ${r.already_done}`:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:'#0f2044' }}>
                        <td colSpan={4} style={{ padding:'10px 12px', fontWeight:700, color:'rgba(255,255,255,0.7)', fontSize:12 }}>TOTAL</td>
                        <td style={{ padding:'10px 12px', fontWeight:800, color:'#fff', fontSize:15 }}>
                          {preview.total_to_create} entries · {sym}{Number(preview.total_amount).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {preview.learners_without_plan.length > 0 && (
                <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#c2410c', marginBottom:8 }}>
                    ⚠ {preview.learners_without_plan.length} learner{preview.learners_without_plan.length>1?'s':''} will be skipped — no fee plan for their grade
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                    {preview.learners_without_plan.map(l=>(
                      <span key={l.id} style={{ background:'#fff', border:'1px solid #fed7aa', borderRadius:20, padding:'3px 10px', fontSize:12, color:'#374151' }}>
                        {l.name} <span style={{ color:'#94a3b8' }}>· {l.grade} {l.class}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize:12, color:'#9a3412' }}>
                    Fix: go to <strong>Settings → Fee Plans</strong> → add a plan for their grade → come back and generate again.
                  </div>
                </div>
              )}

              {preview.total_to_create === 0 && preview.has_plans && (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13, color:'#15803d', fontWeight:600 }}>
                  ✓ All fee entries already exist for this period — nothing new to generate.
                </div>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
                <button onClick={() => { setShowGen(false); setPreview(null) }}
                  style={{ padding:'9px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                {preview.total_to_create > 0 && (
                  <button onClick={confirmGenerate} disabled={generating}
                    style={{ padding:'9px 20px', background:'#0f2044', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor:'pointer', fontSize:14 }}>
                    {generating ? 'Creating…' : `⚡ Create ${preview.total_to_create} entries`}
                  </button>
                )}
              </div>
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
