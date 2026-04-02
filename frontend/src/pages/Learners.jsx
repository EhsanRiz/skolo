import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 700 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  searchBar: { background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  input: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' },
  table: { width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#94a3b8', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: 14, borderTop: '1px solid #f1f5f9', color: '#374151' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  mInput: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  section: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },
  viewField: { marginBottom: 14 },
  viewLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  viewValue: { fontSize: 15, color: '#1e293b' },
  divider: { borderTop: '1px solid #f1f5f9', margin: '16px 0' },
  noGrades: { fontSize: 13, color: '#94a3b8', marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }
}

const emptyLearner  = { first_name: '', last_name: '', date_of_birth: '', gender: '', class_id: '' }
const emptyGuardian = { first_name: '', last_name: '', phone: '', email: '', relationship: 'mother' }

function phonePlaceholder(code) {
  if (code === 'LS') return 'XXXX XXXX (8 digits)'
  if (code === 'ZA') return '0XX XXX XXXX (10 digits)'
  return 'Phone number'
}
function phoneMaxLen(code) {
  if (code === 'LS') return 8
  if (code === 'ZA') return 10
  return 15
}

export default function Learners() {
  const { school } = useAuth()
  const countryCode = school?.countries?.code || 'LS'

  const [learners, setLearners] = useState([])
  const [grades, setGrades]     = useState([])
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // null | 'add' | 'view' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyLearner)
  const [guardian, setGuardian] = useState(emptyGuardian)
  const [saving, setSaving]     = useState(false)

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

  const openAdd = () => { setForm(emptyLearner); setGuardian(emptyGuardian); setModal('add') }
  const openView = l => { setSelected(l); setModal('view') }
  const openEdit = l => {
    setSelected(l)
    setForm({ first_name: l.first_name, last_name: l.last_name, date_of_birth: l.date_of_birth || '', gender: l.gender || '', class_id: l.class_id || '' })
    const g = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
    if (g) setGuardian({ first_name: g.first_name, last_name: g.last_name, phone: g.phone, email: g.email || '', relationship: g.relationship || 'mother' })
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setSelected(null) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/learners', { learner: form, guardian })
      closeModal(); load()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const update = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.patch(`/learners/${selected.id}`, form)
      closeModal(); load()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Remove this learner? Records will be preserved.')) return
    await api.delete(`/learners/${id}`); load()
  }

  // Build class dropdown options from grades
  const classOptions = grades.flatMap(g =>
    (g.classes || []).map(c => ({ value: c.id, label: `${g.name} — ${c.name}` }))
  )
  const gradeOnlyOptions = grades.map(g => ({ value: '', label: g.name, disabled: true,
    // grades without classes — show grade name as group header
  }))

  const getClassName = l => {
    if (!l.class_id) return '—'
    for (const g of grades) {
      const c = (g.classes || []).find(c => c.id === l.class_id)
      if (c) return `${g.name} ${c.name}`
    }
    return '—'
  }

  const GradeSelect = () => {
    if (classOptions.length > 0) return (
      <>
        <label style={s.label}>Grade / Class</label>
        <select style={s.mInput} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select class…</option>
          {grades.map(g => (
            <optgroup key={g.id} label={g.name}>
              {(g.classes || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </>
    )
    if (grades.length > 0) return (
      <>
        <label style={s.label}>Grade</label>
        <select style={s.mInput} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select grade…</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </>
    )
    return (
      <>
        <label style={s.label}>Grade / Class</label>
        <div style={s.noGrades}>No grades set up yet. You can add grades in School Settings.</div>
      </>
    )
  }

  return (
    <div>
      <div style={s.header}>
        <div style={s.heading}>Learners</div>
        <button style={s.btn} onClick={openAdd}>+ Add learner</button>
      </div>

      <div style={s.searchBar}>
        <input style={s.input} placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Name</th>
            <th style={s.th}>Class</th>
            <th style={s.th}>Guardian</th>
            <th style={s.th}>Phone</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(l => {
            const primary = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
            return (
              <tr key={l.id}>
                <td style={s.td}>{l.first_name} {l.last_name}</td>
                <td style={s.td}>{getClassName(l)}</td>
                <td style={s.td}>{primary ? `${primary.first_name} ${primary.last_name}` : '—'}</td>
                <td style={s.td}>{primary?.phone || '—'}</td>
                <td style={s.td}>
                  <button style={s.actionBtn} title="View"   onClick={() => openView(l)}>👁</button>
                  <button style={s.actionBtn} title="Edit"   onClick={() => openEdit(l)}>✏️</button>
                  <button style={s.actionBtn} title="Remove" onClick={() => remove(l.id)}>🗑</button>
                </td>
              </tr>
            )
          })}
          {filtered.length === 0 &&
            <tr><td style={{ ...s.td, color: '#94a3b8' }} colSpan={5}>No learners found.</td></tr>
          }
        </tbody>
      </table>

      {/* ADD MODAL */}
      {modal === 'add' && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={s.modal}>
            <div style={s.mTitle}>Add learner</div>
            <form onSubmit={save}>
              <div style={s.section}>Learner details</div>
              <div style={s.row}>
                <div><label style={s.label}>First name *</label>
                  <input style={s.mInput} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={s.label}>Last name *</label>
                  <input style={s.mInput} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={s.row}>
                <div><label style={s.label}>Date of birth</label>
                  <input style={s.mInput} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={s.label}>Gender</label>
                  <select style={s.mInput} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />

              <div style={s.section}>Parent / Guardian</div>
              <div style={s.row}>
                <div><label style={s.label}>First name *</label>
                  <input style={s.mInput} name="first_name" value={guardian.first_name} onChange={hg} required /></div>
                <div><label style={s.label}>Last name *</label>
                  <input style={s.mInput} name="last_name" value={guardian.last_name} onChange={hg} required /></div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Phone * — {phonePlaceholder(countryCode)}</label>
                  <input style={s.mInput} name="phone" value={guardian.phone} onChange={hg}
                    placeholder={phonePlaceholder(countryCode)} maxLength={phoneMaxLen(countryCode)} required />
                </div>
                <div><label style={s.label}>Relationship</label>
                  <select style={s.mInput} name="relationship" value={guardian.relationship} onChange={hg}>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="guardian">Guardian</option>
                  </select></div>
              </div>
              <label style={s.label}>Email</label>
              <input style={s.mInput} name="email" type="email" value={guardian.email} onChange={hg} />

              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={closeModal}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save learner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && selected && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={s.modal}>
            <div style={s.mTitle}>{selected.first_name} {selected.last_name}</div>
            <div style={s.section}>Learner details</div>
            <div style={s.row}>
              <div style={s.viewField}><div style={s.viewLabel}>Date of birth</div>
                <div style={s.viewValue}>{selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-ZA') : '—'}</div></div>
              <div style={s.viewField}><div style={s.viewLabel}>Gender</div>
                <div style={s.viewValue}>{selected.gender || '—'}</div></div>
            </div>
            <div style={s.viewField}><div style={s.viewLabel}>Class</div>
              <div style={s.viewValue}>{getClassName(selected)}</div></div>
            <div style={s.divider} />
            <div style={s.section}>Parent / Guardian</div>
            {selected.learner_guardians?.map(lg => {
              const g = lg.guardians
              return (
                <div key={g.id}>
                  <div style={s.row}>
                    <div style={s.viewField}><div style={s.viewLabel}>Name</div>
                      <div style={s.viewValue}>{g.first_name} {g.last_name}</div></div>
                    <div style={s.viewField}><div style={s.viewLabel}>Relationship</div>
                      <div style={s.viewValue}>{g.relationship || '—'}</div></div>
                  </div>
                  <div style={s.row}>
                    <div style={s.viewField}><div style={s.viewLabel}>Phone</div>
                      <div style={s.viewValue}>{g.phone}</div></div>
                    <div style={s.viewField}><div style={s.viewLabel}>Email</div>
                      <div style={s.viewValue}>{g.email || '—'}</div></div>
                  </div>
                </div>
              )
            })}
            <div style={s.mFooter}>
              <button style={s.cancelBtn} onClick={closeModal}>Close</button>
              <button style={s.saveBtn} onClick={() => openEdit(selected)}>Edit →</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modal === 'edit' && selected && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={s.modal}>
            <div style={s.mTitle}>Edit — {selected.first_name} {selected.last_name}</div>
            <form onSubmit={update}>
              <div style={s.section}>Learner details</div>
              <div style={s.row}>
                <div><label style={s.label}>First name *</label>
                  <input style={s.mInput} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={s.label}>Last name *</label>
                  <input style={s.mInput} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={s.row}>
                <div><label style={s.label}>Date of birth</label>
                  <input style={s.mInput} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={s.label}>Gender</label>
                  <select style={s.mInput} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />
              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={closeModal}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
