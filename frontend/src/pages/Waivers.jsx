import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

const STATUS = {
  pending:  { bg:'#fef9c3', color:'#a16207', label:'Pending' },
  approved: { bg:'#dcfce7', color:'#15803d', label:'Approved' },
  rejected: { bg:'#fee2e2', color:'#dc2626', label:'Rejected' },
}

export default function Waivers() {
  const { user, school } = useAuth()
  const toast = useToast()
  const sym   = school?.countries?.currency_symbol || 'R'
  const isApprover = ['admin','principal'].includes(user?.role)

  const [requests, setRequests]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [filter,   setFilter]     = useState('pending')
  const [selected, setSelected]   = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [acting,   setActing]     = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await api.get('/waivers'); setRequests(data) }
    catch { } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = requests.filter(r => filter === 'all' ? true : r.status === filter)

  const approve = async () => {
    setActing(true)
    try {
      await api.post(`/waivers/${selected.id}/approve`, { review_note: reviewNote })
      toast.success('Waiver approved — ledger updated')
      setSelected(null); setReviewNote(''); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setActing(false) }
  }

  const reject = async () => {
    if (!reviewNote.trim()) { toast.error('Please provide a reason for rejection'); return }
    setActing(true)
    try {
      await api.post(`/waivers/${selected.id}/reject`, { review_note: reviewNote })
      toast.success('Waiver rejected')
      setSelected(null); setReviewNote(''); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setActing(false) }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>
          Waiver Requests
        </h1>
        <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>
          {isApprover ? 'Review and approve fee waiver requests from staff' : 'Your waiver requests and their status'}
        </p>
      </div>

      {/* Pending banner for approvers */}
      {isApprover && pendingCount > 0 && (
        <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:700, color:'#7c3aed', fontSize:14 }}>
            🔔 {pendingCount} waiver{pendingCount > 1 ? 's' : ''} awaiting your approval
          </div>
          <button onClick={() => setFilter('pending')}
            style={{ padding:'6px 14px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Review now
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:2, background:'#f1f5f9', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[
          { key:'pending',  label:`Pending (${requests.filter(r=>r.status==='pending').length})` },
          { key:'approved', label:'Approved' },
          { key:'rejected', label:'Rejected' },
          { key:'all',      label:'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: filter===f.key ? '#fff' : 'none',
              color: filter===f.key ? '#0f2044' : '#64748b',
              boxShadow: filter===f.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:24, marginBottom:10 }}>✅</div>
            <div style={{ fontWeight:600, color:'#374151', marginBottom:4 }}>
              {filter === 'pending' ? 'No pending waivers' : 'No requests found'}
            </div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Learner','Grade','Amount','Reason','Requested by','Date','Status',''].map(h =>
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const s = STATUS[r.status] || STATUS.pending
                return (
                  <tr key={r.id} style={{ borderTop:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>
                      {r.learners?.first_name} {r.learners?.last_name}
                      {r.learners?.reference_no && <span style={{ marginLeft:6, fontSize:11, color:'#94a3b8' }}>#{r.learners.reference_no}</span>}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#64748b' }}>
                      {r.learners?.classes?.grades?.name} {r.learners?.classes?.name}
                    </td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:'#7c3aed', fontSize:15 }}>
                      {sym}{Number(r.amount_requested).toLocaleString()}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{r.reason}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#64748b' }}>{r.requested_user?.full_name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#94a3b8' }}>
                      {new Date(r.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {r.status === 'pending' && isApprover && (
                        <button onClick={() => { setSelected(r); setReviewNote('') }}
                          style={{ padding:'5px 14px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          Review
                        </button>
                      )}
                      {r.status !== 'pending' && r.review_note && (
                        <button onClick={() => setSelected(r)}
                          style={{ padding:'5px 14px', background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(2px)' }}
          onClick={e => e.target===e.currentTarget && setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:18, padding:'32px', width:'100%', maxWidth:480, boxShadow:'0 24px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>
              {selected.status === 'pending' ? 'Review waiver request' : 'Waiver details'}
            </h2>

            {/* Waiver summary */}
            <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:12, padding:'18px', marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  ['Learner',       `${selected.learners?.first_name} ${selected.learners?.last_name}`],
                  ['Amount',        `${sym}${Number(selected.amount_requested).toLocaleString()}`],
                  ['Reason',        selected.reason],
                  ['Requested by',  selected.requested_user?.full_name || '—'],
                  ['Fee entry',     selected.fee_ledger?.description || '—'],
                  ['Date',          new Date(selected.created_at).toLocaleDateString('en-ZA')],
                ].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.note && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #e9d5ff' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>Bursar note</div>
                  <div style={{ fontSize:13, color:'#374151' }}>{selected.note}</div>
                </div>
              )}
            </div>

            {/* Review decision (only for pending + approvers) */}
            {selected.status === 'pending' && isApprover && (
              <>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Note <span style={{ color:'#94a3b8', fontWeight:400 }}>(required for rejection, optional for approval)</span>
                </label>
                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  placeholder="e.g. Approved — learner qualifies for hardship bursary"
                  style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', marginBottom:16, resize:'vertical', minHeight:80, fontFamily:'inherit', boxSizing:'border-box' }} />
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button onClick={() => setSelected(null)}
                    style={{ padding:'9px 18px', background:'#f1f5f9', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', color:'#374151' }}>Cancel</button>
                  <button onClick={reject} disabled={acting}
                    style={{ padding:'9px 18px', background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:9, fontWeight:700, cursor:'pointer' }}>
                    {acting ? '…' : '✗ Reject'}
                  </button>
                  <button onClick={approve} disabled={acting}
                    style={{ padding:'9px 18px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:9, fontWeight:700, cursor:'pointer' }}>
                    {acting ? '…' : '✓ Approve'}
                  </button>
                </div>
              </>
            )}

            {/* Reviewed state */}
            {selected.status !== 'pending' && (
              <>
                <div style={{ background: selected.status==='approved'?'#f0fdf4':'#fef2f2', border:`1px solid ${selected.status==='approved'?'#86efac':'#fca5a5'}`, borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color: selected.status==='approved'?'#15803d':'#dc2626', marginBottom:4 }}>
                    {selected.status==='approved' ? '✅ Approved' : '❌ Rejected'} by {selected.reviewed_user?.full_name || 'Admin'}
                  </div>
                  {selected.review_note && <div style={{ fontSize:13, color:'#374151' }}>{selected.review_note}</div>}
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={() => setSelected(null)}
                    style={{ padding:'9px 18px', background:'#f1f5f9', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer' }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
