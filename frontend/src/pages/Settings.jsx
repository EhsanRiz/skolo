import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const s = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  sub: { color: '#64748b', fontSize: 14, marginBottom: 24 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: 'none', color: '#64748b' },
  activeTab: { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  card: { background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  btnSm: { padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnDanger: { padding: '6px 14px', background: 'none', border: '1.5px solid #fca5a5', color: '#dc2626', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnGhost: { padding: '6px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  gradeBlock: { border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '16px', marginBottom: 12 },
  gradeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gradeName: { fontWeight: 700, fontSize: 15 },
  classList: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  classChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 20, padding: '4px 12px', fontSize: 13 },
  chipDel: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 0 },
  addRow: { display: 'flex', gap: 8, marginTop: 8 },
  addInput: { flex: 1, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#94a3b8', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px', fontSize: 14, borderTop: '1px solid #f1f5f9', color: '#374151' },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' },
  success: { background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 420 },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
}

// Preset grade names for quick setup
const GRADE_PRESETS = ['Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

export default function Settings() {
  const { school } = useAuth()
  const [tab, setTab] = useState('grades')
  const [grades, setGrades] = useState([])
  const [users, setUsers]   = useState([])
  const [saving, setSaving] = useState(false)
  const [flash, setFlash]   = useState('')

  // School profile form
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', school_reg_number: '' })

  // New grade input
  const [newGradeName, setNewGradeName] = useState('')

  // New class inputs per grade (keyed by grade id)
  const [newClassNames, setNewClassNames] = useState({})

  // Add user modal
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'bursar' })

  const showFlash = msg => { setFlash(msg); setTimeout(() => setFlash(''), 3000) }

  const loadGrades = () => api.get('/grades').then(r => setGrades(r.data)).catch(() => {})
  const loadUsers  = () => api.get('/users').then(r => setUsers(r.data)).catch(() => {})

  useEffect(() => {
    loadGrades()
    if (school) {
      setProfile({
        name: school.name || '',
        phone: school.phone || '',
        email: school.email || '',
        school_reg_number: school.school_reg_number || ''
      })
    }
  }, [school])

  useEffect(() => {
    if (tab === 'users') loadUsers()
  }, [tab])

  // ─── GRADES ──────────────────────────────────────────────────

  const addGrade = async (name) => {
    const n = (name || newGradeName).trim()
    if (!n) return
    try {
      await api.post('/grades', { name: n, display_order: grades.length })
      setNewGradeName('')
      loadGrades()
      showFlash(`Grade "${n}" added`)
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const addAllPresets = async () => {
    const existing = grades.map(g => g.name)
    const toAdd = GRADE_PRESETS.filter(p => !existing.includes(p))
    if (toAdd.length === 0) { showFlash('All standard grades already added'); return }
    setSaving(true)
    try {
      for (let i = 0; i < toAdd.length; i++) {
        await api.post('/grades', { name: toAdd[i], display_order: grades.length + i })
      }
      loadGrades()
      showFlash(`Added ${toAdd.length} grades`)
    } catch (err) { alert('Failed to add grades') }
    finally { setSaving(false) }
  }

  const deleteGrade = async (id, name) => {
    if (!confirm(`Delete grade "${name}"? This will remove all associated classes.`)) return
    try {
      await api.delete(`/grades/${id}`)
      loadGrades()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  // ─── CLASSES ─────────────────────────────────────────────────

  const addClass = async (gradeId) => {
    const name = (newClassNames[gradeId] || '').trim()
    if (!name) return
    try {
      await api.post('/grades/classes', { grade_id: gradeId, name })
      setNewClassNames(prev => ({ ...prev, [gradeId]: '' }))
      loadGrades()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const deleteClass = async (classId) => {
    try {
      await api.delete(`/grades/classes/${classId}`)
      loadGrades()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  // ─── SCHOOL PROFILE ──────────────────────────────────────────

  const saveProfile = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.patch('/schools/me', profile)
      showFlash('School profile updated')
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  // ─── USERS ───────────────────────────────────────────────────

  const addUser = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/users', userForm)
      setShowUserModal(false)
      setUserForm({ full_name: '', email: '', password: '', role: 'bursar' })
      loadUsers()
      showFlash('User added')
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const toggleUser = async (id, is_active) => {
    try {
      await api.patch(`/users/${id}`, { is_active: !is_active })
      loadUsers()
    } catch (err) { alert('Failed') }
  }

  return (
    <div>
      <div style={s.heading}>School Settings</div>
      <div style={s.sub}>Manage grades, classes, school profile and staff accounts.</div>

      {flash && <div style={s.success}>✅ {flash}</div>}

      <div style={s.tabs}>
        {[['grades','🎓 Grades & Classes'], ['profile','🏫 School Profile'], ['users','👤 Staff Accounts']].map(([key, label]) => (
          <button key={key} style={{ ...s.tab, ...(tab === key ? s.activeTab : {}) }} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── GRADES & CLASSES ── */}
      {tab === 'grades' && (
        <div>
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.cardTitle}>Grades</div>
              <button style={s.btnGhost} onClick={addAllPresets} disabled={saving}>
                + Add all standard grades (R–12)
              </button>
            </div>

            {grades.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
                No grades yet. Add them manually or click "Add all standard grades".
              </div>
            )}

            {grades.map(g => (
              <div key={g.id} style={s.gradeBlock}>
                <div style={s.gradeHeader}>
                  <div style={s.gradeName}>{g.name}</div>
                  <button style={s.btnDanger} onClick={() => deleteGrade(g.id, g.name)}>Delete grade</button>
                </div>

                {/* Classes */}
                <div style={s.classList}>
                  {(g.classes || []).map(c => (
                    <div key={c.id} style={s.classChip}>
                      {c.name}
                      <button style={s.chipDel} onClick={() => deleteClass(c.id)}>✕</button>
                    </div>
                  ))}
                  {(g.classes || []).length === 0 && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>No classes — add below or leave empty</div>
                  )}
                </div>

                <div style={s.addRow}>
                  <input
                    style={s.addInput}
                    placeholder="Class name e.g. 6A"
                    value={newClassNames[g.id] || ''}
                    onChange={e => setNewClassNames(prev => ({ ...prev, [g.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addClass(g.id))}
                  />
                  <button style={s.btnSm} onClick={() => addClass(g.id)}>+ Add class</button>
                </div>
              </div>
            ))}

            {/* Add custom grade */}
            <div style={{ ...s.addRow, marginTop: 16 }}>
              <input
                style={s.addInput}
                placeholder="Custom grade name e.g. Grade 7"
                value={newGradeName}
                onChange={e => setNewGradeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGrade())}
              />
              <button style={s.btn} onClick={() => addGrade()}>+ Add grade</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHOOL PROFILE ── */}
      {tab === 'profile' && (
        <div style={s.card}>
          <div style={s.cardTitle}>School Profile</div>
          <form onSubmit={saveProfile}>
            <label style={s.label}>School name *</label>
            <input style={s.input} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
            <div style={s.row}>
              <div>
                <label style={s.label}>Phone</label>
                <input style={s.input} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Registration number (EMIS / MoE ref)</label>
            <input style={s.input} value={profile.school_reg_number} onChange={e => setProfile(p => ({ ...p, school_reg_number: e.target.value }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── STAFF ACCOUNTS ── */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Staff accounts</div>
            <button style={s.btn} onClick={() => setShowUserModal(true)}>+ Add staff</button>
          </div>
          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.full_name}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}><span style={s.badge}>{u.role}</span></td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#16a34a' : '#dc2626' }}>
                        {u.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.btnGhost} onClick={() => toggleUser(u.id, u.is_active)}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={5}>No staff accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {showUserModal && (
            <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowUserModal(false)}>
              <div style={s.modal}>
                <div style={s.mTitle}>Add staff account</div>
                <form onSubmit={addUser}>
                  <label style={s.label}>Full name *</label>
                  <input style={s.input} value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} required />
                  <label style={s.label}>Email *</label>
                  <input style={s.input} type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
                  <label style={s.label}>Password *</label>
                  <input style={s.input} type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                  <label style={s.label}>Role</label>
                  <select style={s.input} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="bursar">Bursar</option>
                    <option value="principal">Principal</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div style={s.mFooter}>
                    <button type="button" style={s.cancelBtn} onClick={() => setShowUserModal(false)}>Cancel</button>
                    <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Add staff'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
