import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { IconUpload, IconEdit, ActionBtn, t } from '../components/ui'
import api from '../lib/api'

const PRESETS = ['Grade R','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']

function GradeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}
function SchoolIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function UsersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}

const TABS = [
  { key: 'grades',  label: 'Grades & Classes', Icon: GradeIcon  },
  { key: 'profile', label: 'School Profile',   Icon: SchoolIcon  },
  { key: 'users',   label: 'Staff Accounts',   Icon: UsersIcon   },
]

export default function Settings() {
  const { school, user: currentUser } = useAuth()
  const toast = useToast()
  const [tab,    setTab]    = useState('grades')
  const [grades, setGrades] = useState([])
  const [users,  setUsers]  = useState([])
  const [saving, setSaving] = useState(false)
  const [newGrade, setNewGrade] = useState('')
  const [newClasses, setNewClasses] = useState({})
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser]       = useState(null) // user object being edited
  const [viewUser, setViewUser]       = useState(null) // user object being viewed
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'bursar' })
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: 'bursar', password: '' })
  const [profile, setProfile]   = useState({ name: '', phone: '', email: '', school_reg_number: '' })
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef()

  const loadGrades = () => api.get('/grades').then(r => setGrades(r.data)).catch(() => {})
  const loadUsers  = () => api.get('/users').then(r => setUsers(r.data)).catch(() => {})

  useEffect(() => { loadGrades() }, [])
  useEffect(() => { if (tab === 'users') loadUsers() }, [tab])
  useEffect(() => {
    if (school) {
      setProfile({ name: school.name || '', phone: school.phone || '', email: school.email || '', school_reg_number: school.school_reg_number || '' })
      setLogoPreview(school.logo_url || null)
    }
  }, [school])

  // GRADES
  const addGrade = async name => {
    const n = (name || newGrade).trim()
    if (!n) return
    try { await api.post('/grades', { name: n, display_order: grades.length }); setNewGrade(''); loadGrades(); toast.success(`"${n}" added`) }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }
  const addAllPresets = async () => {
    const existing = grades.map(g => g.name)
    const toAdd = PRESETS.filter(p => !existing.includes(p))
    if (!toAdd.length) { toast.info('All standard grades already added'); return }
    setSaving(true)
    try { for (let i=0; i<toAdd.length; i++) await api.post('/grades', { name: toAdd[i], display_order: grades.length + i }); loadGrades(); toast.success(`${toAdd.length} grades added`) }
    catch { toast.error('Failed to add grades') } finally { setSaving(false) }
  }
  const deleteGrade = async (id, name) => {
    if (!confirm(`Delete grade "${name}"?`)) return
    try { await api.delete(`/grades/${id}`); loadGrades(); toast.success('Grade deleted') }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }
  const addClass = async gradeId => {
    const name = (newClasses[gradeId] || '').trim()
    if (!name) return
    try { await api.post('/grades/classes', { grade_id: gradeId, name }); setNewClasses(p => ({ ...p, [gradeId]: '' })); loadGrades() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }
  const deleteClass = async id => {
    try { await api.delete(`/grades/classes/${id}`); loadGrades() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  // PROFILE
  const saveProfile = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.patch('/schools/me', profile); toast.success('Profile updated') }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  // LOGO
  const handleLogoFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const base64 = ev.target.result.split(',')[1]
        const { data } = await api.post('/upload/logo', { base64, mime_type: file.type, file_name: file.name })
        setLogoPreview(data.logo_url)
        toast.success('Logo uploaded — reload to see it in the sidebar')
      } catch (err) { toast.error(err.response?.data?.error || 'Upload failed') }
      finally { setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  // USERS
  const addUser = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/users', userForm)
      setShowAddUser(false)
      setUserForm({ full_name: '', email: '', password: '', role: 'bursar' })
      loadUsers(); toast.success('Staff account created')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const saveEdit = async e => {
    e.preventDefault(); setSaving(true)
    const payload = { full_name: editForm.full_name, email: editForm.email, role: editForm.role }
    if (editForm.password) payload.password = editForm.password
    try {
      await api.patch(`/users/${editUser.id}`, payload)
      setEditUser(null); loadUsers(); toast.success('Staff account updated')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const toggleUser = async (u) => {
    if (u.id === currentUser?.id) { toast.warning("You can't disable your own account"); return }
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
      loadUsers()
      toast.success(u.is_active ? 'Account disabled' : 'Account enabled')
    } catch { toast.error('Failed') }
  }

  const openEdit = u => {
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role, password: '' })
    setEditUser(u)
  }

  const TabBtn = ({ k, label, Icon }) => (
    <button onClick={() => setTab(k)} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontWeight: 600, fontSize: 13, transition: 'all .15s',
      background: tab === k ? '#fff' : 'none',
      color: tab === k ? '#1d4ed8' : '#64748b',
      boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none'
    }}><Icon />{label}</button>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Manage grades, school profile and staff accounts</p>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(({ key, label, Icon }) => <TabBtn key={key} k={key} label={label} Icon={Icon} />)}
      </div>

      {/* GRADES */}
      {tab === 'grades' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Grades</div>
            <button style={t.btn.ghost} onClick={addAllPresets} disabled={saving}>+ Add all standard grades (R–12)</button>
          </div>
          {!grades.length && <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>No grades yet.</div>}
          {grades.map(g => (
            <div key={g.id} style={{ border: '1.5px solid #f1f5f9', borderRadius: 10, padding: '16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                <button onClick={() => deleteGrade(g.id, g.name)} style={{ ...t.btn.danger, padding: '5px 12px', fontSize: 12 }}>Delete</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(g.classes || []).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 20, padding: '4px 10px 4px 12px', fontSize: 13, fontWeight: 500 }}>
                    {c.name}
                    <button onClick={() => deleteClass(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                ))}
                {!(g.classes || []).length && <div style={{ fontSize: 12, color: '#94a3b8' }}>No classes — add class letters below (A, B, C…)</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...t.input, marginBottom: 0, flex: 1, padding: '7px 12px', fontSize: 13 }}
                  placeholder="Class letter e.g. A"
                  value={newClasses[g.id] || ''}
                  onChange={e => setNewClasses(p => ({ ...p, [g.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addClass(g.id))} />
                <button style={{ ...t.btn.primary, padding: '7px 14px', fontSize: 13 }} onClick={() => addClass(g.id)}>+ Add class</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input style={{ ...t.input, marginBottom: 0, flex: 1 }} placeholder="Custom grade e.g. Grade 7"
              value={newGrade} onChange={e => setNewGrade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGrade())} />
            <button style={t.btn.primary} onClick={() => addGrade()}>+ Add grade</button>
          </div>
        </div>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>School Profile</div>
          <div style={{ marginBottom: 24, padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>School Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" style={{ height: 60, maxWidth: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', padding: 6 }} />
                : <div style={{ width: 80, height: 60, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SchoolIcon /></div>
              }
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: 'none' }} />
                <button style={{ ...t.btn.ghost, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <IconUpload size={14} />{uploading ? 'Uploading…' : logoPreview ? 'Change logo' : 'Upload logo'}
                </button>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>PNG or JPG · max 2MB · appears in sidebar</div>
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 3, fontWeight: 500 }}>⚠ Create "school-logos" bucket in Supabase Storage first</div>
              </div>
            </div>
          </div>
          <form onSubmit={saveProfile}>
            <label style={t.label}>School name *</label>
            <input style={t.input} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={t.label}>Phone</label><input style={t.input} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><label style={t.label}>Email</label><input style={t.input} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <label style={t.label}>Registration number (EMIS / MoE ref)</label>
            <input style={t.input} value={profile.school_reg_number} onChange={e => setProfile(p => ({ ...p, school_reg_number: e.target.value }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Staff accounts</div>
            <button style={t.btn.primary} onClick={() => setShowAddUser(true)}>+ Add staff</button>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Name','Email','Role','Status','Actions'].map(h => <th key={h} style={t.th}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id}>
                      <td style={{ ...t.td, fontWeight: 600 }}>
                        {u.full_name}
                        {isSelf && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(you)</span>}
                      </td>
                      <td style={t.td}>{u.email}</td>
                      <td style={t.td}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{u.role}</span></td>
                      <td style={t.td}><span style={{ background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#15803d' : '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{u.is_active ? 'active' : 'disabled'}</span></td>
                      <td style={t.td}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <ActionBtn onClick={() => setViewUser(u)} title="View"><IconEye /></ActionBtn>
                          <ActionBtn onClick={() => openEdit(u)} title="Edit"><IconEdit /></ActionBtn>
                          <button
                            onClick={() => toggleUser(u)}
                            disabled={isSelf}
                            title={isSelf ? "Can't disable your own account" : (u.is_active ? 'Disable' : 'Enable')}
                            style={{ ...t.btn.ghost, padding: '5px 12px', fontSize: 12, opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!users.length && <tr><td colSpan={5} style={{ ...t.td, color: '#94a3b8', textAlign: 'center', padding: 40 }}>No staff accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW USER MODAL */}
      {viewUser && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setViewUser(null)}>
          <div style={{ ...t.modal, maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Staff — {viewUser.full_name}</h2>
            {[['Full name', viewUser.full_name], ['Email', viewUser.email], ['Role', viewUser.role], ['Status', viewUser.is_active ? 'Active' : 'Disabled'], ['Joined', new Date(viewUser.created_at).toLocaleDateString('en-ZA')]].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={t.btn.ghost} onClick={() => setViewUser(null)}>Close</button>
              <button style={t.btn.primary} onClick={() => { openEdit(viewUser); setViewUser(null) }}>Edit →</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUser && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div style={{ ...t.modal, maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Edit — {editUser.full_name}</h2>
            <form onSubmit={saveEdit}>
              <label style={t.label}>Full name *</label>
              <input style={t.input} value={editForm.full_name} onChange={e => setEditForm(f=>({...f,full_name:e.target.value}))} required />
              <label style={t.label}>Email *</label>
              <input style={t.input} type="email" value={editForm.email} onChange={e => setEditForm(f=>({...f,email:e.target.value}))} required />
              <label style={t.label}>Role</label>
              <select style={t.input} value={editForm.role} onChange={e => setEditForm(f=>({...f,role:e.target.value}))}>
                <option value="bursar">Bursar</option>
                <option value="principal">Principal</option>
                <option value="admin">Admin</option>
              </select>
              <label style={t.label}>New password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(leave blank to keep current)</span></label>
              <input style={t.input} type="password" value={editForm.password} onChange={e => setEditForm(f=>({...f,password:e.target.value}))} minLength={8} placeholder="Min 8 characters" />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUser && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setShowAddUser(false)}>
          <div style={{ ...t.modal, maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Add staff account</h2>
            <form onSubmit={addUser}>
              <label style={t.label}>Full name *</label>
              <input style={t.input} value={userForm.full_name} onChange={e => setUserForm(f=>({...f,full_name:e.target.value}))} required />
              <label style={t.label}>Email *</label>
              <input style={t.input} type="email" value={userForm.email} onChange={e => setUserForm(f=>({...f,email:e.target.value}))} required />
              <label style={t.label}>Password *</label>
              <input style={t.input} type="password" value={userForm.password} onChange={e => setUserForm(f=>({...f,password:e.target.value}))} required minLength={8} />
              <label style={t.label}>Role</label>
              <select style={t.input} value={userForm.role} onChange={e => setUserForm(f=>({...f,role:e.target.value}))}>
                <option value="bursar">Bursar</option>
                <option value="principal">Principal</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Add staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Need IconEye in scope
function IconEye({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
