import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const STATUS_STYLE = {
  paid:    { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  partial: { bg: '#fef4d6', color: '#b8870a', label: 'Partial' },
  overdue: { bg: '#fef4d6', color: '#b8870a', label: 'Overdue' },
  pending: { bg: '#f7f7f7', color: '#6b7280', label: 'Pending' },
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; color: #1f2937; }
@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
.card { animation: fadeIn 0.4s ease both; }
`

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700, background:s.bg, color:s.color }}>{s.label}</span>
}

function LearnerCard({ learner, sym }) {
  const [open, setOpen] = useState(true)
  const { fee_summary: fs, recent_entries: entries } = learner
  const hasBalance = fs.balance > 0

  return (
    <div className="card" style={{ background:'#fff', borderRadius:16, marginBottom:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', border: fs.overdue > 0 ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb' }}>
      {/* Learner header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding:'18px 20px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
          background: fs.overdue > 0 ? '#fff5f5' : '#fafafa' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:17, color:'#1f2937' }}>
            {learner.first_name} {learner.last_name}
          </div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:2 }}>
            {learner.grade || 'Unassigned'}
            {learner.reference_no && <span style={{ marginLeft:8, fontSize:11, background:'#f7f7f7', color:'#6b7280', padding:'1px 7px', borderRadius:10, fontWeight:600 }}>#{learner.reference_no}</span>}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22, fontWeight:800, color: hasBalance ? '#b8870a' : '#16a34a' }}>
            {sym}{fs.balance.toLocaleString()}
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:1 }}>
            {hasBalance ? 'outstanding' : 'all settled ✓'}
          </div>
        </div>
      </div>

      {/* Fee summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', borderTop:'1px solid #f7f7f7' }}>
        {[
          { label:'Total due',   value:`${sym}${fs.total_due.toLocaleString()}` },
          { label:'Paid',        value:`${sym}${fs.total_paid.toLocaleString()}`, color:'#16a34a' },
          { label:'Balance',     value:`${sym}${fs.balance.toLocaleString()}`,    color: fs.balance > 0 ? '#b8870a' : '#16a34a' },
        ].map((c, i) => (
          <div key={c.label} style={{ padding:'12px 16px', borderLeft: i > 0 ? '1px solid #f7f7f7' : 'none' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>{c.label}</div>
            <div style={{ fontWeight:700, fontSize:15, color: c.color || '#1f2937' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Overdue warning */}
      {fs.overdue > 0 && (
        <div style={{ padding:'10px 20px', background:'#fef4d6', borderTop:'1px solid #fcd34d', fontSize:13, color:'#b8870a', fontWeight:600 }}>
          ⚠ {fs.overdue} overdue payment{fs.overdue > 1 ? 's' : ''} — please contact the school
        </div>
      )}

      {/* Fee entries */}
      {open && entries.length > 0 && (
        <div style={{ borderTop:'1px solid #f7f7f7' }}>
          <div style={{ padding:'12px 20px 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px' }}>
            Recent fee history
          </div>
          {entries.map(e => {
            const balance = Number(e.amount_due) - Number(e.amount_paid)
            return (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 20px', borderTop:'1px solid #fafafa' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, fontSize:14, color:'#1f2937', marginBottom:2 }}>{e.description}</div>
                  <div style={{ fontSize:12, color:'#9ca3af' }}>
                    Due: {new Date(e.due_date).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign:'right', marginLeft:16 }}>
                  <StatusBadge status={e.status} />
                  <div style={{ fontSize:13, fontWeight:700, marginTop:4, color: balance > 0 ? '#b8870a' : '#16a34a' }}>
                    {balance > 0 ? `${sym}${balance.toLocaleString()} due` : `${sym}${Number(e.amount_paid).toLocaleString()} paid`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ParentPortal() {
  const { token } = useParams()
  const [data,    setData]    = useState(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setError('Invalid portal link'); setLoading(false); return }
    fetch(`${API}/portal/${token}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('This portal link is invalid or has expired. Please contact your school.'); setLoading(false) })
  }, [token])

  const sym = data?.school?.countries?.currency_symbol || 'R'

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:'#f7f7f7' }}>
        {/* Header */}
        <div style={{ background:'#003049', color:'#fff', padding:'0 20px' }}>
          <div style={{ maxWidth:640, margin:'0 auto', padding:'18px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.3px' }}>
                {data?.school?.logo_url
                  ? <img src={data.school.logo_url} alt="logo" style={{ height:28, maxWidth:120, objectFit:'contain', verticalAlign:'middle', marginRight:8 }} />
                  : null}
                {data?.school?.name || 'Skolo'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>Parent Fee Portal</div>
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'right' }}>
              {new Date().toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px' }}>
          {loading && (
            <div style={{ textAlign:'center', color:'#6b7280', padding:48, fontSize:14 }}>Loading your account…</div>
          )}

          {error && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:12, padding:'20px 24px', color:'#dc2626', fontSize:14, fontWeight:500 }}>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Welcome */}
              <div className="card" style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:'#1f2937', marginBottom:4 }}>
                  Welcome, {data.guardian.first_name}
                </h1>
                <p style={{ fontSize:14, color:'#6b7280' }}>
                  Here's the current fee status for your {data.learners.length === 1 ? 'child' : 'children'}.
                </p>
              </div>

              {/* Learner cards */}
              {data.learners.map(learner => (
                <LearnerCard key={learner.id} learner={learner} sym={sym} />
              ))}

              {data.learners.length === 0 && (
                <div style={{ background:'#fff', borderRadius:12, padding:40, textAlign:'center', color:'#9ca3af' }}>
                  No active learners found on this account.
                </div>
              )}

              {/* Footer note */}
              <div style={{ marginTop:24, padding:'16px 20px', background:'#fff', borderRadius:12, fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
                <strong style={{ color:'#374151' }}>Questions about your fees?</strong><br />
                Please contact {data.school?.name} directly.
                {data.school?.phone && <> Phone: <strong>{data.school.phone}</strong></>}
                {data.school?.email && <> · Email: <strong>{data.school.email}</strong></>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
