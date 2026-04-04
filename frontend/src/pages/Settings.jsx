import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { IconUpload, IconEdit, ActionBtn, t } from '../components/ui'
import api from '../lib/api'

const PRESETS = ['Grade R','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']

// ── Tab icons ─────────────────────────────────────────────────
const GradeIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
const FeeIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const TeacherIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><rect x="16" y="11" width="6" height="10" rx="1"/><path d="M19 11v-1a2 2 0 0 0-2-2v0"/></svg>
const SchoolIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const UsersIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const EyeIcon      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>

const TABS = [
  { key:'grades',   label:'Grades & Classes', Icon:GradeIcon   },
  { key:'feeplans', label:'Fee Plans',         Icon:FeeIcon     },
  { key:'teachers', label:'Teachers',          Icon:TeacherIcon },
  { key:'profile',  label:'School Profile',    Icon:SchoolIcon  },
  { key:'users',    label:'Staff Accounts',    Icon:UsersIcon   },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Settings() {
  const { school, user: currentUser, refreshSchool } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('grades')

  // Grades
  const [grades, setGrades] = useState([])
  const [newGrade, setNewGrade] = useState('')
  const [newClasses, setNewClasses] = useState({})

  // Fee plans
  const [feePlans, setFeePlans] = useState([])
  const [showFeePlan, setShowFeePlan] = useState(false)
  const [fpForm, setFpForm] = useState({ name:'', grade_id:'', amount:'', frequency:'monthly', due_day:1, term:1, year:new Date().getFullYear() })

  // Teachers
  const [teachers, setTeachers] = useState([])
  const [showTeacher, setShowTeacher] = useState(false)
  const [editTeacher, setEditTeacher] = useState(null)
  const [tcForm, setTcForm] = useState({ full_name:'', email:'', phone:'', subject:'' })

  // Users
  const [users, setUsers] = useState([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [userForm, setUserForm] = useState({ full_name:'', email:'', password:'', role:'bursar' })
  const [editForm, setEditForm] = useState({ full_name:'', email:'', role:'bursar', password:'' })

  // Profile
  const [profile, setProfile] = useState({ name:'', phone:'', email:'', school_reg_number:'' })
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const [saving, setSaving] = useState(false)

  const loadGrades   = () => api.get('/grades').then(r=>setGrades(r.data)).catch(()=>{})
  const loadFeePlans = () => api.get('/fee-plans').then(r=>setFeePlans(r.data)).catch(()=>{})
  const loadTeachers = () => api.get('/teachers').then(r=>setTeachers(r.data)).catch(()=>{})
  const [teacherClasses, setTeacherClasses] = useState([])
  const loadTeacherClasses = () => api.get('/teacher-classes').then(r=>setTeacherClasses(r.data)).catch(()=>{})
  const loadUsers    = () => api.get('/users').then(r=>setUsers(r.data)).catch(()=>{})

  useEffect(() => { loadGrades() }, [])
  useEffect(() => { if (tab==='feeplans') loadFeePlans() }, [tab])
  useEffect(() => { if (tab==='teachers') { loadTeachers(); loadGrades(); loadTeacherClasses() } }, [tab])
  useEffect(() => { if (tab==='users') loadUsers() }, [tab])
  useEffect(() => {
    if (school) {
      setProfile({ name:school.name||'', phone:school.phone||'', email:school.email||'', school_reg_number:school.school_reg_number||'' })
      setLogoPreview(school.logo_url||null)
    }
  }, [school])

  // ── GRADES ────────────────────────────────────────────────────
  const addGrade = async name => {
    const n = (name||newGrade).trim(); if(!n) return
    try { await api.post('/grades',{name:n,display_order:grades.length}); setNewGrade(''); loadGrades(); toast.success(`"${n}" added`) }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
  }
  const addAllPresets = async () => {
    const existing = grades.map(g=>g.name)
    const toAdd = PRESETS.filter(p=>!existing.includes(p))
    if(!toAdd.length){ toast.info('All standard grades already added'); return }
    setSaving(true)
    try { for(let i=0;i<toAdd.length;i++) await api.post('/grades',{name:toAdd[i],display_order:grades.length+i}); loadGrades(); toast.success(`${toAdd.length} grades added`) }
    catch{ toast.error('Failed') } finally{ setSaving(false) }
  }
  const deleteGrade = async(id,name) => {
    if(!confirm(`Delete grade "${name}"?`)) return
    try{ await api.delete(`/grades/${id}`); loadGrades(); toast.success('Grade deleted') }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
  }
  const addClass = async gradeId => {
    const name=(newClasses[gradeId]||'').trim(); if(!name) return
    try{ await api.post('/grades/classes',{grade_id:gradeId,name}); setNewClasses(p=>({...p,[gradeId]:''})); loadGrades() }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
  }
  const deleteClass = async id => {
    try{ await api.delete(`/grades/classes/${id}`); loadGrades() }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
  }

  // ── FEE PLANS ─────────────────────────────────────────────────
  const saveFeePlan = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/fee-plans', { ...fpForm, grade_id: fpForm.grade_id || null })
      setShowFeePlan(false)
      setFpForm({ name:'', grade_id:'', amount:'', frequency:'monthly', due_day:1, term:1, year:new Date().getFullYear() })
      loadFeePlans(); toast.success('Fee plan created')
    } catch(err){ toast.error(err.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }
  const togglePlan = async(id, is_active) => {
    try{ await api.patch(`/fee-plans/${id}`,{is_active:!is_active}); loadFeePlans() }
    catch{ toast.error('Failed') }
  }
  const deletePlan = async id => {
    if(!confirm('Delete this fee plan?')) return
    try{ await api.delete(`/fee-plans/${id}`); loadFeePlans(); toast.success('Fee plan deleted') }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
  }

  // ── TEACHERS ─────────────────────────────────────────────────
  const saveTeacher = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if(editTeacher) {
        await api.patch(`/teachers/${editTeacher.id}`, tcForm)
        toast.success('Teacher updated')
      } else {
        await api.post('/teachers', tcForm)
        toast.success('Teacher added')
      }
      setShowTeacher(false); setEditTeacher(null)
      setTcForm({ full_name:'', email:'', phone:'', subject:'' })
      loadTeachers()
    } catch(err){ toast.error(err.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }
  const openEditTeacher = tc => {
    setTcForm({ full_name:tc.full_name, email:tc.email||'', phone:tc.phone||'', subject:tc.subject||'' })
    setEditTeacher(tc); setShowTeacher(true)
  }
  const deactivateTeacher = async id => {
    if(!confirm('Deactivate this teacher?')) return
    try{ await api.delete(`/teachers/${id}`); loadTeachers(); toast.success('Teacher deactivated') }
    catch{ toast.error('Failed') }
  }

  // Class assignment
  const [assignTeacher, setAssignTeacher] = useState(null)
  const [assignForm, setAssignForm] = useState({ class_id:'', subject:'', is_home_class:false })
  const openAssignClass = tc => { setAssignTeacher(tc); setAssignForm({ class_id:'', subject:'', is_home_class:false }) }
  const saveClassAssignment = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/teacher-classes', { teacher_id: assignTeacher.id, ...assignForm })
      setAssignTeacher(null); loadTeacherClasses(); toast.success('Class assigned')
    } catch(err) { toast.error(err.response?.data?.error||'Failed') }
    finally { setSaving(false) }
  }
  const removeTeacherClass = async id => {
    try { await api.delete(`/teacher-classes/${id}`); loadTeacherClasses(); toast.success('Class removed') }
    catch { toast.error('Failed') }
  }

  // Link user account to teacher
  const [linkTeacher, setLinkTeacher] = useState(null)
  const [linkUserId, setLinkUserId] = useState('')
  const openLinkUser = tc => { setLinkTeacher(tc); setLinkUserId(tc.user_id||'') }
  const saveLinkUser = async () => {
    try {
      await api.patch(`/teacher-classes/link-user/${linkTeacher.id}`, { user_id: linkUserId||null })
      setLinkTeacher(null); loadTeachers(); toast.success('Account linked')
    } catch(err) { toast.error(err.response?.data?.error||'Failed') }
  }

  // ── PROFILE ───────────────────────────────────────────────────
  const saveProfile = async e => {
    e.preventDefault(); setSaving(true)
    try{ await api.patch('/schools/me',profile); toast.success('Profile updated') }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }
  const handleLogoFile = async e => {
    const file = e.target.files?.[0]; if(!file) return
    if(file.size > 2*1024*1024){ toast.error('Logo must be under 2MB'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const { data } = await api.post('/upload/logo',{ base64:ev.target.result.split(',')[1], mime_type:file.type, file_name:file.name })
        setLogoPreview(data.logo_url); await refreshSchool(); toast.success('Logo uploaded successfully')
      } catch(err){ toast.error(err.response?.data?.error||'Upload failed') }
      finally{ setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  // ── USERS ─────────────────────────────────────────────────────
  const addUser = async e => {
    e.preventDefault(); setSaving(true)
    try{
      const { data } = await api.post('/users', userForm)
      setShowAddUser(false)
      setUserForm({full_name:'',email:'',role:'bursar'})
      loadUsers()
      if (data.invite_sent) toast.success(`Invite email sent to ${userForm.email}`)
      else toast.success(`Account created — share this link: ${data.invite_url}`)
    }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }

  const resendInvite = async (userId, email) => {
    try{
      const { data } = await api.post(`/users/${userId}/resend-invite`)
      if (data.sent) toast.success(`Invite resent to ${email}`)
      // Also copy to clipboard as fallback
      if (data.invite_url) {
        navigator.clipboard.writeText(data.invite_url).catch(()=>{})
        toast.success(`Link copied to clipboard — share via WhatsApp`)
      }
    } catch { toast.error('Failed to resend invite') }
  }

  const copyInviteLink = async (userId) => {
    try {
      const { data } = await api.post(`/users/${userId}/resend-invite`)
      if (data.invite_url) {
        await navigator.clipboard.writeText(data.invite_url)
        toast.success('Invite link copied — paste into WhatsApp or email')
      }
    } catch { toast.error('Failed to generate link') }
  }

  const deleteUser = async (userId, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/users/${userId}`)
      loadUsers()
      toast.success('Account deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }
  const saveEdit = async e => {
    e.preventDefault(); setSaving(true)
    const payload={full_name:editForm.full_name,email:editForm.email,role:editForm.role}
    if(editForm.password) payload.password=editForm.password
    try{ await api.patch(`/users/${editUser.id}`,payload); setEditUser(null); loadUsers(); toast.success('Account updated') }
    catch(err){ toast.error(err.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }
  const toggleUser = async u => {
    if(u.id===currentUser?.id){ toast.warning("Can't disable your own account"); return }
    try{ await api.patch(`/users/${u.id}`,{is_active:!u.is_active}); loadUsers(); toast.success(u.is_active?'Account disabled':'Account enabled') }
    catch{ toast.error('Failed') }
  }
  const openEditUser = u => { setEditForm({full_name:u.full_name,email:u.email,role:u.role,password:''}); setEditUser(u) }

  // Flatten classes for dropdowns
  const classOptions = grades.flatMap(g=>(g.classes||[]).map(c=>({ value:c.id, label:`${g.name} ${c.name}` })))

  const TabBtn = ({k,label,Icon}) => (
    <button onClick={()=>setTab(k)} style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
      fontWeight:600, fontSize:13, transition:'all .15s',
      background:tab===k?'#fff':'none', color:tab===k?'#0f2044':'#64748b',
      boxShadow:tab===k?'0 1px 3px rgba(0,0,0,.1)':'none'
    }}><Icon/>{label}</button>
  )

  const Card = ({children, title}) => (
    <div style={{background:'#fff',borderRadius:14,padding:'24px',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
      {title && <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>{title}</div>}
      {children}
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.3px'}}>Settings</h1>
        <p style={{fontSize:14,color:'#64748b',marginTop:2}}>Grades, fee plans, teachers, school profile and staff</p>
      </div>

      <div style={{display:'flex',gap:2,marginBottom:24,background:'#f1f5f9',borderRadius:10,padding:4,flexWrap:'wrap'}}>
        {TABS.map(({key,label,Icon})=><TabBtn key={key} k={key} label={label} Icon={Icon}/>)}
      </div>

      {/* ── GRADES ── */}
      {tab==='grades' && (
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontWeight:700,fontSize:16}}>Grades</div>
            <button style={t.btn.ghost} onClick={addAllPresets} disabled={saving}>+ Add all standard grades (R–12)</button>
          </div>
          {!grades.length && <div style={{color:'#94a3b8',fontSize:14,marginBottom:20}}>No grades yet.</div>}
          {grades.map(g=>(
            <div key={g.id} style={{border:'1.5px solid #f1f5f9',borderRadius:10,padding:'16px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:14}}>{g.name}</div>
                <button onClick={()=>deleteGrade(g.id,g.name)} style={{...t.btn.danger,padding:'5px 12px',fontSize:12}}>Delete</button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                {(g.classes||[]).map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:6,background:'#f1f5f9',borderRadius:20,padding:'4px 10px 4px 12px',fontSize:13,fontWeight:500}}>
                    {c.name}<button onClick={()=>deleteClass(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:14,padding:0}}>✕</button>
                  </div>
                ))}
                {!(g.classes||[]).length && <div style={{fontSize:12,color:'#94a3b8'}}>No classes — add letters below (A, B, C…)</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <input style={{...t.input,marginBottom:0,flex:1,padding:'7px 12px',fontSize:13}}
                  placeholder="Class letter e.g. A"
                  value={newClasses[g.id]||''}
                  onChange={e=>setNewClasses(p=>({...p,[g.id]:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addClass(g.id))}/>
                <button style={{...t.btn.primary,padding:'7px 14px',fontSize:13}} onClick={()=>addClass(g.id)}>+ Add class</button>
              </div>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <input style={{...t.input,marginBottom:0,flex:1}} placeholder="Custom grade e.g. Grade 7"
              value={newGrade} onChange={e=>setNewGrade(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addGrade())}/>
            <button style={t.btn.primary} onClick={()=>addGrade()}>+ Add grade</button>
          </div>
        </Card>
      )}

      {/* ── FEE PLANS ── */}
      {tab==='feeplans' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Fee Plans</div>
              <div style={{fontSize:13,color:'#64748b',marginTop:2}}>Define fees per grade. Use Fees → Generate to create learner entries.</div>
            </div>
            <button style={t.btn.primary} onClick={()=>setShowFeePlan(true)}>+ New fee plan</button>
          </div>
          <Card>
            {!feePlans.length && (
              <div style={{color:'#94a3b8',fontSize:14,textAlign:'center',padding:'32px 0'}}>
                No fee plans yet. Create one to get started.
              </div>
            )}
            {feePlans.length > 0 && (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  {['Name','Grade','Amount','Frequency','Due','Year','Status',''].map(h=><th key={h} style={t.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {feePlans.map(fp=>(
                    <tr key={fp.id}>
                      <td style={{...t.td,fontWeight:600}}>{fp.name}</td>
                      <td style={t.td}>{fp.grades?.name||<span style={{color:'#94a3b8'}}>All grades</span>}</td>
                      <td style={{...t.td,fontWeight:700}}>{school?.countries?.currency_symbol}{Number(fp.amount).toLocaleString()}</td>
                      <td style={t.td}>{fp.frequency}</td>
                      <td style={t.td}>{fp.frequency==='monthly' ? `Day ${fp.due_day}` : `Term ${fp.term}`}</td>
                      <td style={t.td}>{fp.year}</td>
                      <td style={t.td}>
                        <span style={{background:fp.is_active?'#dcfce7':'#f1f5f9',color:fp.is_active?'#15803d':'#64748b',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>
                          {fp.is_active?'active':'inactive'}
                        </span>
                      </td>
                      <td style={t.td}>
                        <div style={{display:'flex',gap:6}}>
                          <button style={{...t.btn.ghost,padding:'5px 10px',fontSize:12}} onClick={()=>togglePlan(fp.id,fp.is_active)}>
                            {fp.is_active?'Pause':'Activate'}
                          </button>
                          <button style={{...t.btn.danger,padding:'5px 10px',fontSize:12}} onClick={()=>deletePlan(fp.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── TEACHERS ── */}
      {tab==='teachers' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Teachers</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>
                Teachers appear here automatically when invited via Staff Accounts with role <strong>teacher</strong>. Assign their classes below.
              </div>
            </div>
          </div>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Ref','Name','Email','Classes assigned','Login account',''].map(h=><th key={h} style={t.th}>{h}</th>)}</tr></thead>
              <tbody>
                {teachers.filter(tc=>tc.is_active).map(tc=>{
                  const myClasses  = teacherClasses.filter(c=>c.teacher_id===tc.id)
                  const linkedUser = users.find(u=>u.id===tc.user_id)
                  return (
                    <tr key={tc.id}>
                      <td style={{...t.td,fontSize:11,color:'#94a3b8',fontWeight:700}}>{tc.reference_no||'—'}</td>
                      <td style={{...t.td,fontWeight:600}}>
                        {tc.full_name}
                        {tc.phone && <div style={{fontSize:11,color:'#94a3b8'}}>{tc.phone}</div>}
                      </td>
                      <td style={t.td}>{tc.email||'—'}</td>
                      <td style={t.td}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}}>
                          {myClasses.length === 0
                            ? <span style={{color:'#94a3b8',fontSize:12}}>None assigned</span>
                            : myClasses.map(c=>(
                                <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:3,
                                  background:c.is_home_class?'#0f2044':'#f1f5f9',
                                  color:c.is_home_class?'#fff':'#374151',
                                  borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600}}>
                                  {c.classes?.grades?.name} {c.classes?.name}
                                  {c.subject ? ` · ${c.subject}` : ''}
                                  {c.is_home_class ? ' 🏠' : ''}
                                  <button onClick={()=>removeTeacherClass(c.id)}
                                    style={{background:'none',border:'none',cursor:'pointer',
                                      color:c.is_home_class?'rgba(255,255,255,0.6)':'#94a3b8',
                                      fontSize:12,padding:'0 0 0 2px',lineHeight:1}}>✕</button>
                                </span>
                              ))
                          }
                          <button onClick={()=>openAssignClass(tc)}
                            style={{background:'none',border:'1px dashed #cbd5e1',borderRadius:20,
                              padding:'2px 8px',fontSize:11,color:'#64748b',cursor:'pointer',fontWeight:600}}>
                            + class
                          </button>
                        </div>
                      </td>
                      <td style={t.td}>
                        {linkedUser
                          ? <span style={{fontSize:11,background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                              ✓ {linkedUser.full_name}
                            </span>
                          : <button onClick={()=>openLinkUser(tc)}
                              style={{fontSize:11,background:'#faf5ff',border:'1px solid #c4b5fd',
                                borderRadius:20,padding:'3px 10px',cursor:'pointer',color:'#7c3aed',fontWeight:600}}>
                              🔗 Link account
                            </button>
                        }
                      </td>
                      <td style={t.td}>
                        <div style={{display:'flex',gap:6}}>
                          <ActionBtn onClick={()=>openEditTeacher(tc)} title="Edit"><IconEdit/></ActionBtn>
                          <button style={{...t.btn.danger,padding:'5px 10px',fontSize:12}} onClick={()=>deactivateTeacher(tc.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!teachers.filter(tc=>tc.is_active).length && (
                  <tr><td colSpan={6} style={{...t.td,color:'#94a3b8',textAlign:'center',padding:40}}>No teachers yet.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab==='profile' && (
        <Card title="School Profile">
          <div style={{marginBottom:24,padding:'20px',background:'#f8fafc',borderRadius:12,border:'1.5px dashed #e2e8f0'}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>School Logo</div>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" style={{height:60,maxWidth:160,objectFit:'contain',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',padding:6}}/>
                : <div style={{width:80,height:60,background:'#e2e8f0',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><SchoolIcon/></div>
              }
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} style={{display:'none'}}/>
                <button style={{...t.btn.ghost,display:'flex',alignItems:'center',gap:8}} onClick={()=>fileRef.current?.click()} disabled={uploading}>
                  <IconUpload size={14}/>{uploading?'Uploading…':logoPreview?'Change logo':'Upload logo'}
                </button>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:6}}>PNG or JPG · max 2MB · appears in sidebar</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Logo is stored securely — no external bucket required</div>
              </div>
            </div>
          </div>
          <form onSubmit={saveProfile}>
            <label style={t.label}>School name *</label>
            <input style={t.input} value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} required/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={t.label}>Phone</label><input style={t.input} value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))}/></div>
              <div><label style={t.label}>Email</label><input style={t.input} type="email" value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))}/></div>
            </div>
            <label style={t.label}>Registration number (EMIS / MoE ref)</label>
            <input style={t.input} value={profile.school_reg_number} onChange={e=>setProfile(p=>({...p,school_reg_number:e.target.value}))}/>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':'Save profile'}</button>
            </div>
          </form>
        </Card>
      )}

      {/* ── USERS ── */}
      {tab==='users' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:16}}>Staff accounts</div>
            <button style={t.btn.primary} onClick={()=>setShowAddUser(true)}>+ Add staff</button>
          </div>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Name','Email','Role','Account','Actions'].map(h=><th key={h} style={t.th}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u=>{
                  const isSelf = u.id===currentUser?.id
                  return (
                    <tr key={u.id}>
                      <td style={{...t.td,fontWeight:600}}>{u.full_name}{isSelf&&<span style={{marginLeft:8,fontSize:11,color:'#94a3b8'}}>(you)</span>}</td>
                      <td style={t.td}>{u.email}</td>
                      <td style={t.td}><span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>{u.role}</span></td>
                      <td style={t.td}>
                        {u.password_set === false
                          ? <span style={{background:'#fef9c3',color:'#a16207',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>⏳ Invite pending</span>
                          : <span style={{background:u.is_active?'#dcfce7':'#fee2e2',color:u.is_active?'#15803d':'#dc2626',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>{u.is_active?'active':'disabled'}</span>
                        }
                      </td>
                      <td style={t.td}>
                        <div style={{display:'flex',gap:6}}>
                          <ActionBtn onClick={()=>setViewUser(u)} title="View"><EyeIcon/></ActionBtn>
                          <ActionBtn onClick={()=>openEditUser(u)} title="Edit"><IconEdit/></ActionBtn>
                          {u.password_set === false ? (
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>copyInviteLink(u.id)}
                                style={{...t.btn.ghost,padding:'5px 10px',fontSize:11,color:'#0f2044',border:'1px solid #0f2044',fontWeight:700}}>
                                📋 Copy link
                              </button>
                              <button onClick={()=>resendInvite(u.id, u.email)}
                                style={{...t.btn.ghost,padding:'5px 10px',fontSize:11,color:'#a16207',border:'1px solid #fcd34d'}}>
                                Resend
                              </button>
                              <button onClick={()=>deleteUser(u.id, u.full_name)}
                                style={{...t.btn.danger,padding:'5px 10px',fontSize:11}}>
                                Delete
                              </button>
                            </div>
                          ) : (
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>toggleUser(u)} disabled={isSelf}
                                style={{...t.btn.ghost,padding:'5px 12px',fontSize:12,opacity:isSelf?.4:1,cursor:isSelf?'not-allowed':'pointer'}}>
                                {u.is_active?'Disable':'Enable'}
                              </button>
                              {!isSelf && <button onClick={()=>deleteUser(u.id, u.full_name)}
                                style={{...t.btn.danger,padding:'5px 10px',fontSize:12}}>
                                Delete
                              </button>}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!users.length&&<tr><td colSpan={5} style={{...t.td,color:'#94a3b8',textAlign:'center',padding:40}}>No staff yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── FEE PLAN MODAL ── */}
      {showFeePlan && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setShowFeePlan(false)}>
          <div style={{...t.modal,maxWidth:440}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>New fee plan</h2>
            <form onSubmit={saveFeePlan}>
              <label style={t.label}>Name *</label>
              <input style={t.input} value={fpForm.name} onChange={e=>setFpForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Monthly Tuition" required/>
              <label style={t.label}>Grade <span style={{color:'#94a3b8',fontWeight:400}}>(leave blank to apply to all grades)</span></label>
              <select style={t.input} value={fpForm.grade_id} onChange={e=>setFpForm(f=>({...f,grade_id:e.target.value}))}>
                <option value="">All grades</option>
                {grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={t.label}>Amount *</label><input style={t.input} type="number" step="0.01" value={fpForm.amount} onChange={e=>setFpForm(f=>({...f,amount:e.target.value}))} required/></div>
                <div><label style={t.label}>Year *</label><input style={t.input} type="number" value={fpForm.year} onChange={e=>setFpForm(f=>({...f,year:Number(e.target.value)}))} required/></div>
              </div>
              <label style={t.label}>Frequency</label>
              <select style={t.input} value={fpForm.frequency} onChange={e=>setFpForm(f=>({...f,frequency:e.target.value}))}>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
              </select>
              {fpForm.frequency==='monthly' ? (
                <div><label style={t.label}>Due day of month</label>
                  <select style={t.input} value={fpForm.due_day} onChange={e=>setFpForm(f=>({...f,due_day:Number(e.target.value)}))}>
                    {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}{i===0?' st':i===1?' nd':i===2?' rd':' th'}</option>)}
                  </select></div>
              ) : (
                <div><label style={t.label}>Term</label>
                  <select style={t.input} value={fpForm.term} onChange={e=>setFpForm(f=>({...f,term:Number(e.target.value)}))}>
                    {[1,2,3,4].map(n=><option key={n} value={n}>Term {n}</option>)}
                  </select></div>
              )}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
                <button type="button" style={t.btn.ghost} onClick={()=>setShowFeePlan(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':'Create fee plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEACHER MODAL ── */}
      {showTeacher && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&(setShowTeacher(false),setEditTeacher(null))}>
          <div style={{...t.modal,maxWidth:440}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:6}}>{editTeacher?'Edit teacher':'Add teacher'}</h2>
            <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Class scheduling is managed in the timetable view.</p>
            <form onSubmit={saveTeacher}>
              <label style={t.label}>Full name *</label>
              <input style={t.input} value={tcForm.full_name} onChange={e=>setTcForm(f=>({...f,full_name:e.target.value}))} required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={t.label}>Email</label><input style={t.input} type="email" value={tcForm.email} onChange={e=>setTcForm(f=>({...f,email:e.target.value}))}/></div>
                <div>
                  <label style={t.label}>Phone{school?.countries?.code==='LS'?' (XXXX XXXX)':school?.countries?.code==='ZA'?' (0XX XXX XXXX)':''}</label>
                  <input style={t.input} value={tcForm.phone} onChange={e=>setTcForm(f=>({...f,phone:e.target.value}))}
                    placeholder={school?.countries?.code==='LS'?'XXXX XXXX':school?.countries?.code==='ZA'?'082 000 0000':'Phone'}
                    maxLength={school?.countries?.code==='LS'?8:school?.countries?.code==='ZA'?10:20}/>
                </div>
              </div>
              <label style={t.label}>Subject</label>
              <input style={t.input} value={tcForm.subject} onChange={e=>setTcForm(f=>({...f,subject:e.target.value}))} placeholder="e.g. Mathematics, English, Science"/>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
                <button type="button" style={t.btn.ghost} onClick={()=>{setShowTeacher(false);setEditTeacher(null)}}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':editTeacher?'Save changes':'Add teacher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW USER ── */}
      {viewUser && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setViewUser(null)}>
          <div style={{...t.modal,maxWidth:380}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>{viewUser.full_name}</h2>
            {[['Email',viewUser.email],['Role',viewUser.role],['Status',viewUser.is_active?'Active':'Disabled'],['Joined',new Date(viewUser.created_at).toLocaleDateString('en-ZA')]].map(([l,v])=>(
              <div key={l} style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:3}}>{l}</div>
                <div style={{fontSize:15,color:'#0f172a',fontWeight:500}}>{v}</div>
              </div>
            ))}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button style={t.btn.ghost} onClick={()=>setViewUser(null)}>Close</button>
              <button style={t.btn.primary} onClick={()=>{openEditUser(viewUser);setViewUser(null)}}>Edit →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT USER ── */}
      {editUser && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setEditUser(null)}>
          <div style={{...t.modal,maxWidth:420}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>Edit — {editUser.full_name}</h2>
            <form onSubmit={saveEdit}>
              <label style={t.label}>Full name *</label>
              <input style={t.input} value={editForm.full_name} onChange={e=>setEditForm(f=>({...f,full_name:e.target.value}))} required/>
              <label style={t.label}>Email *</label>
              <input style={t.input} type="email" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} required/>
              <label style={t.label}>Role</label>
              <select style={t.input} value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))}>
                <option value="teacher">Teacher</option><option value="bursar">Bursar</option><option value="principal">Principal</option><option value="admin">Admin</option>
              </select>
              <label style={t.label}>New password <span style={{color:'#94a3b8',fontWeight:400}}>(leave blank to keep current)</span></label>
              <input style={t.input} type="password" value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} minLength={8} placeholder="Min 8 characters"/>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
                <button type="button" style={t.btn.ghost} onClick={()=>setEditUser(null)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN CLASS MODAL ── */}
      {assignTeacher && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setAssignTeacher(null)}>
          <div style={{...t.modal,maxWidth:420}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:6}}>Assign class</h2>
            <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Assign {assignTeacher.full_name} to a class and subject.</p>
            <form onSubmit={saveClassAssignment}>
              <label style={t.label}>Class *</label>
              <select style={t.input} value={assignForm.class_id} onChange={e=>setAssignForm(f=>({...f,class_id:e.target.value}))} required>
                <option value="">Select class…</option>
                {classOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label style={t.label}>Subject they teach in this class</label>
              <input style={t.input} value={assignForm.subject} onChange={e=>setAssignForm(f=>({...f,subject:e.target.value}))} placeholder="e.g. Mathematics, English"/>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <input type="checkbox" id="home_class" checked={assignForm.is_home_class} onChange={e=>setAssignForm(f=>({...f,is_home_class:e.target.checked}))} style={{width:16,height:16,cursor:'pointer'}}/>
                <label htmlFor="home_class" style={{fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>This is their home / form class 🏠</label>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" style={t.btn.ghost} onClick={()=>setAssignTeacher(null)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':'Assign class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LINK USER MODAL ── */}
      {linkTeacher && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setLinkTeacher(null)}>
          <div style={{...t.modal,maxWidth:420}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:6}}>Link login account</h2>
            <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>
              Link {linkTeacher.full_name}'s record to a staff login account so they can access My Classes.
            </p>
            <label style={t.label}>Staff account</label>
            <select style={t.input} value={linkUserId} onChange={e=>setLinkUserId(e.target.value)}>
              <option value="">Select account…</option>
              {users.filter(u=>u.is_active).map(u=>(
                <option key={u.id} value={u.id}>{u.full_name} ({u.email}) · {u.role}</option>
              ))}
            </select>
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#15803d'}}>
              💡 Invite the teacher as staff (role: teacher) in the Staff Accounts tab first, then link here.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button style={t.btn.ghost} onClick={()=>setLinkTeacher(null)}>Cancel</button>
              <button style={t.btn.primary} onClick={saveLinkUser}>Link account</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD USER ── */}
      {showAddUser && (
        <div style={t.overlay} onClick={e=>e.target===e.currentTarget&&setShowAddUser(false)}>
          <div style={{...t.modal,maxWidth:420}}>
            <h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>Add staff account</h2>
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#15803d'}}>
                ✉ An invite email will be sent automatically — they set their own password.
              </div>
            <form onSubmit={addUser}>
              <label style={t.label}>Full name *</label>
              <input style={t.input} value={userForm.full_name} onChange={e=>setUserForm(f=>({...f,full_name:e.target.value}))} required/>
              <label style={t.label}>Email *</label>
              <input style={t.input} type="email" value={userForm.email} onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} required/>
              <label style={t.label}>Role</label>
              <select style={t.input} value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))}>
                <option value="teacher">Teacher</option><option value="bursar">Bursar</option><option value="principal">Principal</option><option value="admin">Admin</option>
              </select>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
                <button type="button" style={t.btn.ghost} onClick={()=>setShowAddUser(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving?'Saving…':'Add staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


