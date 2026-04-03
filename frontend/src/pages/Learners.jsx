import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { IconEye, IconEdit, IconTrash, ActionBtn, t } from '../components/ui'
import api from '../lib/api'

const phonePlaceholder = c => c === 'ZA' ? '082 000 0000' : 'XXXX XXXX'
const phoneMaxLen      = c => c === 'ZA' ? 10 : 8

const emptyL = { first_name: '', last_name: '', date_of_birth: '', gender: '', class_id: '' }
const emptyG = { first_name: '', last_name: '', phone: '', email: '', relationship: 'mother' }

export default function Learners() {
  const { school } = useAuth()
  const cc = school?.countries?.code || 'LS'

  const [learners, setLearners] = useState([])
  const [grades,   setGrades]   = useState([])
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(emptyL)
  const [guardian, setGuardian] = useState(emptyG)
  const [saving,   setSaving]   = useState(false)

  const load = () => {
    api.get('/learners').then(r => setLearners(r.data)).catch(() => {})
    api.get('/grades').then(r => setGrades(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const filtered = learners.filter(l =>
    `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  const hf = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const hg = e => setGuardian(g => ({ ...g, [e.target.name]: e.target.value }))

  const openAdd  = () => { setForm(emptyL); setGuardian(emptyG); setModal('add') }
  const openView = l => { setSelected(l); setModal('view') }
  const openEdit = l => {
    setSelected(l)
    setForm({ first_name: l.first_name, last_name: l.last_name, date_of_birth: l.date_of_birth || '', gender: l.gender || '', class_id: l.class_id || '' })
    const g = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
    if (g) setGuardian({ first_name: g.first_name, last_name: g.last_name, phone: g.phone, email: g.email || '', relationship: g.relationship || 'mother' })
    setModal('edit')
  }
  const close = () => { setModal(null); setSelected(null) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/learners', { learner: form, guardian }); close(); load() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const update = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.patch(`/learners/${selected.id}`, form); close(); load() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Remove this learner? Records will be preserved.')) return
    await api.delete(`/learners/${id}`); load()
  }

  // Fix: getClassName — no extra space, just "Grade 1A"
  const getClassName = l => {
    if (!l.class_id) return '—'
    for (const g of grades) {
      const c = (g.classes || []).find(c => c.id === l.class_id)
      if (c) return `${g.name} ${c.name}`
      // If class_id matches a grade id directly (grade without sub-class)
      if (g.id === l.class_id) return g.name
    }
    return '—'
  }

  const GradeSelect = () => {
    const hasClasses = grades.some(g => (g.classes || []).length > 0)
    if (hasClasses) return (
      <>
        <label style={t.label}>Grade / Class</label>
        <select style={t.input} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select class…</option>
          {grades.map(g => (
            <optgroup key={g.id} label={g.name}>
              {(g.classes || []).map(c => <option key={c.id} value={c.id}>{g.name}{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </>
    )
    if (grades.length > 0) return (
      <>
        <label style={t.label}>Grade</label>
        <select style={t.input} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select grade…</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </>
    )
    return (
      <>
        <label style={t.label}>Grade / Class</label>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, padding: '9px 13px', background: '#f8fafc', borderRadius: 9 }}>
          No grades set up yet — go to Settings → Grades & Classes
        </div>
      </>
    )
  }

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Learners</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{learners.length} active learner{learners.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={t.btn.primary} onClick={openAdd}>+ Add learner</button>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <input style={{ ...t.input, marginBottom: 0, background: '#f8fafc' }}
          placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={t.th}>Name</th>
              <th style={t.th}>Grade / Class</th>
              <th style={t.th}>Guardian</th>
              <th style={t.th}>Phone</th>
              <th style={{ ...t.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const primary = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
              return (
                <tr key={l.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...t.td, fontWeight: 600, color: '#0f172a' }}>{l.first_name} {l.last_name}</td>
                  <td style={t.td}>{getClassName(l)}</td>
                  <td style={t.td}>{primary ? `${primary.first_name} ${primary.last_name}` : '—'}</td>
                  <td style={t.td}>{primary?.phone || '—'}</td>
                  <td style={{ ...t.td, textAlign: 'right' }}>
                    <ActionBtn onClick={() => openView(l)} title="View"><IconEye /></ActionBtn>
                    <ActionBtn onClick={() => openEdit(l)} title="Edit"><IconEdit /></ActionBtn>
                    <ActionBtn onClick={() => remove(l.id)} title="Remove" variant="danger"><IconTrash /></ActionBtn>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 &&
              <tr><td colSpan={5} style={{ ...t.td, color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                No learners found.
              </td></tr>
            }
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {modal === 'add' && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20, color: '#0f172a' }}>Add learner</h2>
            <form onSubmit={save}>
              <div style={t.sectionLabel}>Learner details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Date of birth</label><input style={t.input} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={t.label}>Gender</label>
                  <select style={t.input} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />

              <div style={t.sectionLabel}>Parent / Guardian</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={guardian.first_name} onChange={hg} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={guardian.last_name} onChange={hg} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={t.label}>Phone * ({phonePlaceholder(cc)})</label>
                  <input style={t.input} name="phone" value={guardian.phone} onChange={hg} placeholder={phonePlaceholder(cc)} maxLength={phoneMaxLen(cc)} required />
                </div>
                <div><label style={t.label}>Relationship</label>
                  <select style={t.input} name="relationship" value={guardian.relationship} onChange={hg}>
                    <option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option>
                  </select></div>
              </div>
              <label style={t.label}>Email</label>
              <input style={t.input} name="email" type="email" value={guardian.email} onChange={hg} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={close}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save learner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && selected && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>{selected.first_name} {selected.last_name}</h2>
            <div style={t.sectionLabel}>Learner details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Date of birth" value={selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-ZA') : null} />
              <Field label="Gender" value={selected.gender} />
            </div>
            <Field label="Grade / Class" value={getClassName(selected)} />
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />
            <div style={t.sectionLabel}>Parent / Guardian</div>
            {selected.learner_guardians?.map(lg => {
              const g = lg.guardians
              return (
                <div key={g.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="Name" value={`${g.first_name} ${g.last_name}`} />
                    <Field label="Relationship" value={g.relationship} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="Phone" value={g.phone} />
                    <Field label="Email" value={g.email} />
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={t.btn.ghost} onClick={close}>Close</button>
              <button style={t.btn.primary} onClick={() => openEdit(selected)}>Edit →</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modal === 'edit' && selected && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>Edit — {selected.first_name} {selected.last_name}</h2>
            <form onSubmit={update}>
              <div style={t.sectionLabel}>Learner details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={t.label}>Date of birth</label><input style={t.input} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={t.label}>Gender</label>
                  <select style={t.input} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={close}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
