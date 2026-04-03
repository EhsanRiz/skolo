import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'

const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.class-card { background:#fff; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,.06); overflow:hidden; animation:fadeUp .3s ease both; }
.learner-row { display:flex; justify-content:space-between; align-items:center; padding:11px 20px; border-top:1px solid #f8fafc; cursor:pointer; transition:background .1s; }
.learner-row:hover { background:#f8fafc; }
`

export default function MyClasses() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [data,    setData]    = useState(null) // { teacher, classes }
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState({})   // classId → bool

  useEffect(() => {
    api.get('/teacher-classes/my')
      .then(r => {
        setData(r.data)
        // Auto-expand home class and first class
        const expanded = {}
        ;(r.data.classes || []).forEach((c, i) => {
          if (c.is_home_class || i === 0) expanded[c.class_id] = true
        })
        setOpen(expanded)
        setLoading(false)
      })
      .catch(err => {
        if (err.response?.status === 404) {
          toast.error('No teacher record linked to your account. Contact your admin.')
        }
        setLoading(false)
      })
  }, [])

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }))

  if (loading) return (
    <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>Loading your classes…</div>
  )

  if (!data) return (
    <div style={{ background:'#fff', borderRadius:14, padding:48, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
      <div style={{ fontWeight:700, fontSize:16, color:'#0f172a', marginBottom:8 }}>No teacher record found</div>
      <div style={{ fontSize:14, color:'#64748b' }}>
        Ask your admin to link your account to a teacher record in Settings → Teachers.
      </div>
    </div>
  )

  const totalLearners = (data.classes || []).reduce((s, c) => {
    return s + (c.classes?.learners?.filter(l => l.is_active)?.length || 0)
  }, 0)

  return (
    <>
      <style>{CSS}</style>
      <div>
        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px' }}>
            My Classes
          </h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:2 }}>
            {data.teacher.full_name} · {data.classes.length} class{data.classes.length !== 1 ? 'es' : ''} · {totalLearners} learners
          </p>
        </div>

        {/* No classes assigned */}
        {data.classes.length === 0 && (
          <div style={{ background:'#fff', borderRadius:14, padding:48, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:28, marginBottom:12 }}>📚</div>
            <div style={{ fontWeight:700, fontSize:15, color:'#374151', marginBottom:6 }}>No classes assigned yet</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>Ask your admin to assign you to a class in Settings → Teachers.</div>
          </div>
        )}

        {/* Class cards */}
        {data.classes.map((tc, idx) => {
          const cls      = tc.classes
          const learners = (cls?.learners || []).filter(l => l.is_active)
          const isOpen   = !!open[tc.class_id]

          return (
            <div key={tc.id} className="class-card" style={{ marginBottom:16, animationDelay:`${idx * 80}ms` }}>
              {/* Class header */}
              <div onClick={() => toggle(tc.class_id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', cursor:'pointer',
                  background: tc.is_home_class ? '#0f2044' : '#f8fafc' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16, fontWeight:800, color: tc.is_home_class ? '#fff' : '#0f172a' }}>
                      {cls?.grades?.name} {cls?.name}
                    </span>
                    {tc.is_home_class && (
                      <span style={{ fontSize:11, background:'rgba(255,255,255,0.2)', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
                        Home class
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:13, color: tc.is_home_class ? 'rgba(255,255,255,0.6)' : '#64748b', marginTop:2 }}>
                    {tc.subject && <span>{tc.subject} · </span>}
                    {learners.length} learner{learners.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={tc.is_home_class ? 'rgba(255,255,255,0.6)' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .2s', flexShrink:0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Learner list */}
              {isOpen && (
                <div>
                  {learners.length === 0 && (
                    <div style={{ padding:'20px 20px', fontSize:13, color:'#94a3b8', textAlign:'center' }}>
                      No active learners in this class.
                    </div>
                  )}
                  {learners.map(l => (
                    <div key={l.id} className="learner-row"
                      onClick={() => navigate(`/learners/${l.id}`)}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, background:'#f1f5f9', borderRadius:8,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:700, color:'#64748b', flexShrink:0 }}>
                          {l.first_name[0]}{l.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color:'#0f172a' }}>
                            {l.first_name} {l.last_name}
                          </div>
                          {l.reference_no && (
                            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>#{l.reference_no}</div>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                  {/* Quick stats footer */}
                  {learners.length > 0 && (
                    <div style={{ padding:'10px 20px', background:'#f8fafc', borderTop:'1px solid #f1f5f9',
                      display:'flex', gap:16, fontSize:12, color:'#94a3b8' }}>
                      <span>{learners.length} learners</span>
                      {tc.subject && <span>Subject: <strong style={{ color:'#374151' }}>{tc.subject}</strong></span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
