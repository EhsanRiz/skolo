import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

// ── Constants ─────────────────────────────────────────────────
const TERMS  = [1, 2, 3, 4]
const GRADE_SYMBOL = mark => {
  if (mark === null || mark === undefined || mark === '') return '—'
  const n = Number(mark)
  if (n >= 80) return 'A'
  if (n >= 70) return 'B'
  if (n >= 60) return 'C'
  if (n >= 50) return 'D'
  return 'F'
}
const GRADE_COLOR = sym => ({
  A: '#15803d', B: '#003049', C: '#b8870a', D: '#b8870a', F: '#dc2626', '—': '#9ca3af'
}[sym] || '#9ca3af')

const DEFAULT_SUBJECTS = [
  'Mathematics', 'English', 'Sesotho', 'Science', 'Social Studies',
  'Life Skills', 'Agriculture', 'Religious Education'
]

const CSS = `
.tab-btn { padding:10px 18px; border:none; cursor:pointer; font-weight:600; font-size:13px;
  background:none; color:#6b7280; border-bottom:2px solid transparent; transition:all .15s; }
.tab-btn:hover { color:#1f2937; }
.tab-btn.active { color:#003049; border-bottom-color:#003049; }
.mark-input { width:60px; padding:5px 8px; border:1.5px solid #e5e7eb; border-radius:7px;
  font-size:13px; font-weight:600; text-align:center; outline:none; transition:border-color .15s; }
.mark-input:focus { border-color:#003049; }
.back-btn { display:inline-flex; align-items:center; gap:6px; color:#6b7280; font-size:13px;
  font-weight:600; text-decoration:none; margin-bottom:20px; }
.back-btn:hover { color:#1f2937; }
`

// ── Sub-components ────────────────────────────────────────────

function ReportCardButton({ learnerId, learnerName }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [year, setYear] = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const toast = useToast()

  const download = async () => {
    setGenerating(true)
    try {
      const token = localStorage.getItem('sk_token')
      const baseUrl = (await import('../lib/api')).default.defaults.baseURL || ''
      const url = `${baseUrl}/report-cards/${learnerId}?term=${term}&year=${year}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate report card' }))
        throw new Error(err.error || 'Failed')
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Report_Card_${learnerName.replace(/\s+/g, '_')}_T${term}_${year}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Report card downloaded')
      setOpen(false)
    } catch (err) {
      toast.error(err.message || 'Failed to generate report card')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background .15s' }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Report Card
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 12,
          padding: '18px 20px', boxShadow: '0 12px 40px rgba(0,0,0,.2)', zIndex: 100, width: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', marginBottom: 14 }}>Download report card</div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Term</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4].map(t => (
              <button key={t} onClick={() => setTerm(t)}
                style={{ flex: 1, padding: '7px 0', border: term === t ? '2px solid #003049' : '1.5px solid #e5e7eb',
                  borderRadius: 7, background: term === t ? '#003049' : '#fff', color: term === t ? '#fff' : '#374151',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                T{t}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13,
              outline: 'none', background: '#fff', marginBottom: 14 }}>
            {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button onClick={download} disabled={generating}
            style={{ width: '100%', padding: '10px', background: '#003049', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: generating ? 0.7 : 1 }}>
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      )}
    </div>
  )
}

function OverviewTab({ learner, school }) {
  const [generatingLink, setGeneratingLink] = useState(false)
  const [portalUrl, setPortalUrl] = useState(null)
  const toast = useToast()

  const guardian = learner.learner_guardians?.find(lg => lg.is_primary)?.guardians
  const grade = `${learner.classes?.grades?.name || ''} ${learner.classes?.name || ''}`.trim() || '—'

  const generatePortal = async () => {
    if (!guardian?.id) { toast.error('No primary guardian found'); return }
    setGeneratingLink(true)
    try {
      const { data } = await api.post('/portal/generate', { guardian_id: guardian.id })
      setPortalUrl(`${window.location.origin}/parent/${data.token}`)
      toast.success('Portal link generated')
    } catch { toast.error('Failed to generate portal link') }
    finally { setGeneratingLink(false) }
  }

  // Pre-populate if guardian already has token
  useEffect(() => {
    if (guardian?.portal_token) {
      setPortalUrl(`${window.location.origin}/parent/${guardian.portal_token}`)
    }
  }, [guardian])

  const Field = ({ label, value }) => (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:500, color:'#1f2937' }}>{value || '—'}</div>
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
      {/* Learner details */}
      <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:18, color:'#1f2937' }}>Learner details</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          <Field label="Reference No."    value={learner.reference_no} />
          <Field label="Grade / Class"    value={grade} />
          <Field label="Date of birth"    value={learner.date_of_birth ? new Date(learner.date_of_birth).toLocaleDateString('en-ZA') : null} />
          <Field label="Gender"           value={learner.gender} />
          <Field label="Status"           value={learner.is_active ? 'Active' : 'Inactive'} />
          <Field label="Enrolled"         value={new Date(learner.created_at).toLocaleDateString('en-ZA')} />
        </div>
      </div>

      {/* Medical */}
      <div style={{ gridColumn:'1/-1', background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', borderLeft:'3px solid #e5e7eb' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:15, color:'#1f2937' }}>Medical information</div>
          <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>Optional · shared only with consent</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
          <Field label="Medical condition" value={learner.medical_condition} />
          <Field label="Doctor / clinic"   value={learner.doctor_name} />
          <Field label="Doctor phone"      value={learner.doctor_phone} />
        </div>
        {!learner.medical_condition && !learner.doctor_name && (
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:6 }}>No medical information on file. Edit the learner record to add.</div>
        )}
      </div>

      {/* Guardian */}
      <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:18, color:'#1f2937' }}>Parent / Guardian</div>
        {guardian ? (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginBottom:16 }}>
              <Field label="Name"         value={`${guardian.first_name} ${guardian.last_name}`} />
              <Field label="Relationship" value={guardian.relationship} />
              <Field label="Phone"        value={guardian.phone} />
              <Field label="Email"        value={guardian.email} />
            </div>
            {/* Portal link */}
            <div style={{ borderTop:'1px solid #f7f7f7', paddingTop:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>Parent portal link</div>
              {portalUrl ? (
                <div style={{ display:'flex', gap:8 }}>
                  <input value={portalUrl} readOnly
                    style={{ flex:1, padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:11, background:'#fafafa', color:'#374151', outline:'none' }} />
                  <button onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Copied!') }}
                    style={{ padding:'7px 14px', background:'#003049', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                    Copy
                  </button>
                </div>
              ) : (
                <button onClick={generatePortal} disabled={generatingLink}
                  style={{ padding:'8px 14px', background:'#f7f7f7', color:'#374151', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  🔗 {generatingLink ? 'Generating…' : 'Generate portal link'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ color:'#9ca3af', fontSize:14 }}>No guardian linked.</div>
        )}
      </div>
    </div>
  )
}

function FeesTab({ learnerId, sym, isReadOnly }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [payEntry, setPayEntry] = useState(null)
  const [payForm, setPayForm] = useState({ amount:'', payment_method:'cash', notes:'' })
  const [paying, setPaying] = useState(false)
  const toast = useToast()
  const year = new Date().getFullYear()

  const METHODS = [
    { value:'cash', label:'Cash' }, { value:'eft', label:'EFT / Bank Transfer' },
    { value:'mobile_money', label:'Mobile Money (M-Pesa)' }, { value:'ewallet', label:'eWallet' },
    { value:'snapscan', label:'SnapScan' }, { value:'other', label:'Other' },
  ]

  const STATUS_C = { paid:['#dcfce7','#15803d'], partial:['#fef4d6','#b8870a'], overdue:['#fef4d6','#b8870a'], pending:['#f7f7f7','#6b7280'] }

  const [catchingUp, setCatchingUp] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/fee-ledger?learner_id=${learnerId}&year=${year}`)
      setEntries(data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => {
    // Auto-generate missing fees for this school then load
    api.post('/fee-ledger/auto-generate').catch(()=>{})
    load()
  }, [learnerId])

  const currentMonth = new Date().toISOString().slice(0,7)
  const currentMonthLabel = new Date().toLocaleDateString('en-ZA',{month:'long',year:'numeric'})
  const hasCurrentMonth = entries.some(e => e.due_date?.slice(0,7) === currentMonth)

  const catchUp = async () => {
    setCatchingUp(true)
    try {
      const { data } = await api.post('/fee-ledger/auto-generate')
      if (data.created > 0) { toast.success(`${data.created} fee entr${data.created>1?'ies':'y'} generated`); load() }
      else toast.info('No new entries — check fee plans exist in Settings → Fee Plans for this grade')
    } catch { toast.error('Failed to generate fees') }
    finally { setCatchingUp(false) }
  }

  const openPay = e => { setPayForm({ amount:(Number(e.amount_due)-Number(e.amount_paid)).toFixed(2), payment_method:'cash', notes:'' }); setPayEntry(e) }

  const recordPay = async ev => {
    ev.preventDefault(); setPaying(true)
    try {
      await api.post(`/fee-ledger/${payEntry.id}/pay`, payForm)
      toast.success('Payment recorded')
      setPayEntry(null); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setPaying(false) }
  }

  const totalDue  = entries.reduce((s,e)=>s+Number(e.amount_due),0)
  const totalPaid = entries.reduce((s,e)=>s+Number(e.amount_paid),0)

  return (
    <div>
      {/* Catch-up banner — shown when no fees exist for current month */}
      {!loading && !hasCurrentMonth && (
        <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#92400e' }}>⚠ No fees generated for {currentMonthLabel}</div>
            <div style={{ fontSize:12, color:'#b8870a', marginTop:2 }}>This learner has no fee entries for the current month.</div>
          </div>
          <button onClick={catchUp} disabled={catchingUp}
            style={{ padding:'7px 14px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            {catchingUp ? 'Generating…' : '⚡ Generate now'}
          </button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total due',    value:`${sym}${totalDue.toLocaleString()}`,             color:'#1f2937' },
          { label:'Paid',         value:`${sym}${totalPaid.toLocaleString()}`,            color:'#16a34a' },
          { label:'Outstanding',  value:`${sym}${(totalDue-totalPaid).toLocaleString()}`, color: totalDue>totalPaid?'#b8870a':'#16a34a' },
        ].map(c=>(
          <div key={c.label} style={{ background:'#fff', borderRadius:10, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>Loading…</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Description','Due date','Due','Paid','Balance','Status',''].map(h=>
                <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:10, fontWeight:700, color:'#9ca3af', background:'#fafafa', textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {entries.map(e=>{
                const bal = Number(e.amount_due)-Number(e.amount_paid)
                const [bg,col] = STATUS_C[e.status] || STATUS_C.pending
                return (
                  <tr key={e.id}>
                    <td style={{ padding:'11px 14px', fontSize:13, fontWeight:500 }}>{e.description}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#6b7280' }}>{new Date(e.due_date).toLocaleDateString('en-ZA')}</td>
                    <td style={{ padding:'11px 14px', fontSize:13 }}>{sym}{Number(e.amount_due).toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', fontSize:13, color:'#16a34a', fontWeight:600 }}>{sym}{Number(e.amount_paid).toLocaleString()}</td>
                    <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:bal>0?'#b8870a':'#16a34a' }}>{sym}{bal.toLocaleString()}</td>
                    <td style={{ padding:'11px 14px' }}><span style={{ background:bg, color:col, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700 }}>{e.status}</span></td>
                    <td style={{ padding:'11px 14px' }}>
                      {e.status!=='paid' && !isReadOnly && <button onClick={()=>openPay(e)} style={{ padding:'5px 12px', background:'#003049', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>Pay</button>}
                    </td>
                  </tr>
                )
              })}
              {!entries.length && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No fee entries for {year}.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Pay modal */}
      {payEntry && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,48,73,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(2px)' }}
          onClick={e=>e.target===e.currentTarget&&setPayEntry(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px', width:'100%', maxWidth:380, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight:800, marginBottom:6 }}>Record payment</h3>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>{payEntry.description}</div>
            <form onSubmit={recordPay}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>Amount ({sym}) *</label>
              <input style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, outline:'none', marginBottom:12 }}
                type="number" step="0.01" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} required />
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>Method</label>
              <select style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, background:'#fff' }}
                value={payForm.payment_method} onChange={e=>setPayForm(f=>({...f,payment_method:e.target.value}))}>
                {METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setPayEntry(null)} style={{ padding:'8px 16px', background:'#f7f7f7', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={paying} style={{ padding:'8px 16px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>{paying?'Saving…':'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ExamGradesTab({ learnerId }) {
  const toast = useToast()
  const year = new Date().getFullYear()
  const [results,    setResults]    = useState([])
  const [subjects,   setSubjects]   = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [saving,     setSaving]     = useState({}) // { "Maths-1": true }
  const [showAdd,    setShowAdd]    = useState(false)

  const load = async () => {
    const { data } = await api.get(`/learner-profile/${learnerId}/exam-results?year=${year}`)
    setResults(data)
    // Build unique subject list
    const fromServer = [...new Set(data.map(r=>r.subject))]
    setSubjects(prev => {
      const merged = [...new Set([...DEFAULT_SUBJECTS, ...fromServer, ...prev])]
      return merged
    })
  }
  useEffect(() => { load() }, [learnerId])

  const getMark = (subject, term) => {
    const r = results.find(r=>r.subject===subject && r.term===term)
    return r ? r.mark : ''
  }

  const getAvg = subject => {
    const marks = TERMS.map(t=>getMark(subject,t)).filter(m=>m!==''&&m!==null)
    if (!marks.length) return null
    return (marks.reduce((s,m)=>s+Number(m),0)/marks.length).toFixed(1)
  }

  const getTermAvg = term => {
    const marks = subjects.map(s=>getMark(s,term)).filter(m=>m!==''&&m!==null)
    if (!marks.length) return null
    return (marks.reduce((s,m)=>s+Number(m),0)/marks.length).toFixed(1)
  }

  const saveMark = async (subject, term, value) => {
    const key = `${subject}-${term}`
    setSaving(s=>({...s,[key]:true}))
    try {
      await api.put(`/learner-profile/${learnerId}/exam-results`, { subject, term, year, mark: value===''?null:value })
      await load()
    } catch (err) { toast.error('Failed to save') }
    finally { setSaving(s=>({...s,[key]:false})) }
  }

  const addSubject = () => {
    const s = newSubject.trim()
    if (!s || subjects.includes(s)) return
    setSubjects(prev=>[...prev,s])
    setNewSubject('')
    setShowAdd(false)
  }

  const removeSubject = subject => {
    if (!confirm(`Remove "${subject}" and all its marks?`)) return
    setSubjects(prev=>prev.filter(s=>s!==subject))
    // Delete from server
    results.filter(r=>r.subject===subject).forEach(r =>
      api.delete(`/learner-profile/${learnerId}/exam-results/${r.id}`).catch(()=>{})
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, color:'#6b7280' }}>Academic Year {year}</div>
        <button onClick={()=>setShowAdd(s=>!s)}
          style={{ padding:'7px 14px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + Add subject
        </button>
      </div>

      {showAdd && (
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={newSubject} onChange={e=>setNewSubject(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addSubject()}
            placeholder="Subject name e.g. Physical Science"
            style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none' }} />
          <button onClick={addSubject} style={{ padding:'9px 16px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Add</button>
          <button onClick={()=>setShowAdd(false)} style={{ padding:'9px 16px', background:'#f7f7f7', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#003049' }}>
              <th style={{ textAlign:'left', padding:'12px 16px', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', width:'30%' }}>Subject</th>
              {TERMS.map(t=>(
                <th key={t} style={{ textAlign:'center', padding:'12px 8px', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
                  Term {t}<br/><span style={{ fontSize:10, fontWeight:400 }}>%  &nbsp; Grade</span>
                </th>
              ))}
              <th style={{ textAlign:'center', padding:'12px 8px', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Average</th>
              <th style={{ width:36 }}></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, si) => {
              const avg = getAvg(subject)
              const avgSym = GRADE_SYMBOL(avg)
              return (
                <tr key={subject} style={{ borderTop:'1px solid #f7f7f7', background: si%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600, color:'#1f2937' }}>{subject}</td>
                  {TERMS.map(term => {
                    const mark  = getMark(subject, term)
                    const sym_  = GRADE_SYMBOL(mark)
                    const key   = `${subject}-${term}`
                    return (
                      <td key={term} style={{ padding:'8px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          <input
                            className="mark-input"
                            type="number" min="0" max="100"
                            defaultValue={mark === '' || mark === null ? '' : mark}
                            key={`${subject}-${term}-${mark}`}
                            onBlur={e => saveMark(subject, term, e.target.value)}
                            disabled={saving[key]}
                          />
                          <span style={{ fontSize:13, fontWeight:800, color:GRADE_COLOR(sym_), width:18 }}>{sym_}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td style={{ padding:'8px', textAlign:'center' }}>
                    {avg !== null ? (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1f2937' }}>{avg}%</span>
                        <span style={{ fontSize:13, fontWeight:800, color:GRADE_COLOR(avgSym) }}>{avgSym}</span>
                      </div>
                    ) : <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ padding:'8px', textAlign:'center' }}>
                    <button onClick={()=>removeSubject(subject)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d5db', fontSize:14, padding:2 }}>✕</button>
                  </td>
                </tr>
              )
            })}

            {/* Term averages footer */}
            <tr style={{ background:'#003049', borderTop:'2px solid #1e3a6b' }}>
              <td style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>TERM AVERAGE</td>
              {TERMS.map(t=>{
                const avg = getTermAvg(t)
                const s = GRADE_SYMBOL(avg)
                return (
                  <td key={t} style={{ padding:'10px 8px', textAlign:'center' }}>
                    {avg!==null
                      ? <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{avg}% <span style={{ color:GRADE_COLOR(s) }}>{s}</span></span>
                      : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>—</span>}
                  </td>
                )
              })}
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
        {subjects.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>
            No subjects yet. Click "+ Add subject" to get started.
          </div>
        )}
      </div>

      <div style={{ marginTop:12, fontSize:12, color:'#9ca3af' }}>
        A ≥ 80% · B ≥ 70% · C ≥ 60% · D ≥ 50% · F &lt; 50% · Click a mark and press Tab/click away to save
      </div>
    </div>
  )
}

function AwardsTab({ learnerId }) {
  const toast = useToast()
  const [awards, setAwards] = useState([])
  const [form,   setForm]   = useState({ title:'', description:'', award_date:'' })
  const [show,   setShow]   = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => { const { data } = await api.get(`/learner-profile/${learnerId}/awards`); setAwards(data) }
  useEffect(() => { load() }, [learnerId])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post(`/learner-profile/${learnerId}/awards`, form); setShow(false); setForm({ title:'',description:'',award_date:'' }); load(); toast.success('Award added') }
    catch (err) { toast.error(err.response?.data?.error||'Failed') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Remove this award?')) return
    await api.delete(`/learner-profile/${learnerId}/awards/${id}`); load(); toast.success('Award removed')
  }

  const AWARD_ICONS = { default:'🏆', academic:'📚', sports:'⚽', art:'🎨', leadership:'⭐', service:'🤝' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, color:'#6b7280' }}>{awards.length} award{awards.length!==1?'s':''}</div>
        <button onClick={()=>setShow(true)} style={{ padding:'7px 14px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + Add award
        </button>
      </div>

      {awards.length === 0 && !show && (
        <div style={{ background:'#fff', borderRadius:12, padding:48, textAlign:'center', color:'#9ca3af', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🏆</div>
          <div style={{ fontWeight:600, marginBottom:4, color:'#374151' }}>No awards yet</div>
          <div style={{ fontSize:13 }}>Add merit badges, achievements and recognitions here.</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
        {awards.map(a => (
          <div key={a.id} style={{ background:'#fff', borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', position:'relative' }}>
            <button onClick={()=>del(a.id)} style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', color:'#d1d5db', fontSize:14 }}>✕</button>
            <div style={{ fontSize:26, marginBottom:8 }}>🏆</div>
            <div style={{ fontWeight:700, fontSize:14, color:'#1f2937', marginBottom:4, paddingRight:20 }}>{a.title}</div>
            {a.description && <div style={{ fontSize:13, color:'#6b7280', marginBottom:8, lineHeight:1.5 }}>{a.description}</div>}
            {a.award_date && <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600 }}>{new Date(a.award_date).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })}</div>}
          </div>
        ))}
      </div>

      {show && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,48,73,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(2px)' }}
          onClick={e=>e.target===e.currentTarget&&setShow(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px', width:'100%', maxWidth:420, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight:800, marginBottom:20 }}>Add award</h3>
            <form onSubmit={save}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>Title *</label>
              <input style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, outline:'none', marginBottom:12 }}
                value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="e.g. Academic Excellence Award" />
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>Description</label>
              <textarea style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, resize:'vertical', minHeight:70 }}
                value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What was this award for?" />
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>Date</label>
              <input type="date" style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, outline:'none', marginBottom:16 }}
                value={form.award_date} onChange={e=>setForm(f=>({...f,award_date:e.target.value}))} />
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShow(false)} style={{ padding:'8px 16px', background:'#f7f7f7', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'8px 16px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>{saving?'Saving…':'Add award'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NotesTab({ learnerId }) {
  const toast = useToast()
  const [notes,  setNotes]  = useState([])
  const [text,   setText]   = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => { const { data } = await api.get(`/learner-profile/${learnerId}/notes`); setNotes(data) }
  useEffect(() => { load() }, [learnerId])

  const save = async e => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try { await api.post(`/learner-profile/${learnerId}/notes`, { note:text }); setText(''); load(); toast.success('Note saved') }
    catch { toast.error('Failed to save note') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (!confirm('Delete this note?')) return
    await api.delete(`/learner-profile/${learnerId}/notes/${id}`); load()
  }

  return (
    <div>
      {/* Add note */}
      <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <form onSubmit={save}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Add a note about this learner — visible to all staff…"
            style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:14, outline:'none', resize:'vertical', minHeight:80, marginBottom:10, fontFamily:'inherit' }} />
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" disabled={saving||!text.trim()}
              style={{ padding:'8px 18px', background:'#003049', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', opacity:text.trim()?1:0.5 }}>
              {saving?'Saving…':'Save note'}
            </button>
          </div>
        </form>
      </div>

      {notes.length === 0 && (
        <div style={{ background:'#fff', borderRadius:12, padding:40, textAlign:'center', color:'#9ca3af', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          No notes yet.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {notes.map(n => (
          <div key={n.id} style={{ background:'#fff', borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6 }}>
                <strong style={{ color:'#374151' }}>{n.users?.full_name || 'Staff'}</strong>
                {' · '}{new Date(n.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </div>
              <div style={{ fontSize:14, color:'#1f2937', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{n.note}</div>
            </div>
            <button onClick={()=>del(n.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d5db', fontSize:14, alignSelf:'flex-start', flexShrink:0, padding:2 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Premium gate ─────────────────────────────────────────────
function PremiumGate({ tab, learnerId }) {
  const labels = { grades:'Exam Grades', awards:'Awards', notes:'Notes' }
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'56px 40px', textAlign:'center',
      boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1.5px dashed #e5e7eb' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:'#1f2937', marginBottom:8 }}>
        {labels[tab]} is a Pro feature
      </div>
      <div style={{ fontSize:14, color:'#6b7280', maxWidth:380, margin:'0 auto 24px', lineHeight:1.7 }}>
        Upgrade to Skolo Pro to unlock exam result tracking, awards management and staff notes for all your learners.
      </div>
      <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
        <div style={{ background:'#fafafa', borderRadius:10, padding:'12px 20px', fontSize:13, color:'#374151' }}>
          📊 Exam grades grid (subjects × terms)
        </div>
        <div style={{ background:'#fafafa', borderRadius:10, padding:'12px 20px', fontSize:13, color:'#374151' }}>
          🏆 Awards and achievements
        </div>
        <div style={{ background:'#fafafa', borderRadius:10, padding:'12px 20px', fontSize:13, color:'#374151' }}>
          📝 Staff notes and observations
        </div>
      </div>
      <div style={{ marginTop:28, fontSize:13, color:'#9ca3af' }}>
        Contact{' '}
        <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer"
           style={{color:'#003049', fontWeight:700, textDecoration:'none'}}>InnovaEarth</a>
        {' '}or{' '}
        <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer"
           style={{color:'#003049', fontWeight:700, textDecoration:'none'}}>4D Climate Solutions</a>
        {' '}to upgrade your school's plan.
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function LearnerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { school, user } = useAuth()
  const sym = school?.countries?.currency_symbol || 'R'

  const [learner, setLearner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    api.get(`/learner-profile/${id}`)
      .then(r => { setLearner(r.data); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#6b7280' }}>Loading…</div>
  if (!learner) return (
    <div style={{ padding:48, textAlign:'center', color:'#6b7280' }}>
      <div>Learner not found.</div>
      <Link to="/learners" style={{ color:'#003049', fontWeight:600 }}>← Back to learners</Link>
    </div>
  )

  const grade = `${learner.classes?.grades?.name||''} ${learner.classes?.name||''}`.trim() || '—'

  const TABS = [
    { key:'overview', label:'Overview',    premium:false },
    { key:'fees',     label:'Fees',        premium:false },
    { key:'grades',   label:'Exam Grades', premium:true  },
    { key:'awards',   label:'Awards',      premium:true  },
    { key:'notes',    label:'Notes',       premium:true  },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div>
        {/* Back link */}
        <Link to="/learners" className="back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          All learners
        </Link>

        {/* Profile header */}
        <div style={{ background:'#003049', borderRadius:14, padding:'24px 28px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:52, height:52, background:'rgba(255,255,255,0.15)', borderRadius:12,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff' }}>
              {learner.first_name[0]}{learner.last_name[0]}
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.3px', marginBottom:3 }}>
                {learner.first_name} {learner.last_name}
              </h1>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', display:'flex', gap:12 }}>
                <span>{grade}</span>
                {learner.reference_no && <span style={{ background:'rgba(255,255,255,0.15)', padding:'1px 8px', borderRadius:10, fontWeight:600, fontSize:11, letterSpacing:'0.4px' }}>#{learner.reference_no}</span>}
              </div>
            </div>
          </div>

          <ReportCardButton learnerId={id} learnerName={`${learner.first_name} ${learner.last_name}`} />
        </div>

        {/* Tabs */}
        <div style={{ borderBottom:'2px solid #e5e7eb', marginBottom:24, display:'flex', gap:0 }}>
          {TABS.map(tb => (
            <button key={tb.key}
              className={`tab-btn${tab===tb.key?' active':''}`}
              onClick={() => setTab(tb.key)}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              {tb.label}
              {tb.premium && <span style={{ fontSize:10, background:'#fef4d6', color:'#b8870a', padding:'1px 6px', borderRadius:10, fontWeight:700, letterSpacing:'0.3px' }}>PRO</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <OverviewTab learner={learner} school={school} />}
        {tab === 'fees'     && <FeesTab learnerId={id} sym={sym} isReadOnly={['principal'].includes(user?.role)} />}
        {(tab === 'grades' || tab === 'awards' || tab === 'notes') && <PremiumGate tab={tab} learnerId={id} />}
      </div>
    </>
  )
}
