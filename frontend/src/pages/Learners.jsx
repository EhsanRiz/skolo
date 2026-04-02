import { useState, useEffect } from 'react'
import api from '../lib/api'

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 700 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  searchBar: { background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', gap: 12 },
  input: { flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' },
  table: { width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#94a3b8', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: 14, borderTop: '1px solid #f1f5f9', color: '#374151' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  mInput: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  section: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 }
}

const empty = { first_name: '', last_name: '', date_of_birth: '', gender: '' }
const emptyG = { first_name: '', last_name: '', phone: '', email: '', relationship: 'mother' }

export default function Learners() {
  const [learners, setLearners] = useState([])
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState(empty)
  const [guardian, setGuardian] = useState(emptyG)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/learners').then(r => setLearners(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const filtered = learners.filter(l =>
    `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  const hf = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const hg = e => setGuardian(g => ({ ...g, [e.target.name]: e.target.value }))

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/learners', { learner: form, guardian })
      setShowModal(false)
      setForm(empty)
      setGuardian(emptyG)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Remove this learner? Their records will be preserved.')) return
    await api.delete(`/learners/${id}`)
    load()
  }

  return (
    <div>
      <div style={s.header}>
        <div style={s.heading}>Learners</div>
        <button style={s.btn} onClick={() => setShowModal(true)}>+ Add learner</button>
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
                <td style={s.td}>{l.classes?.grades?.name} {l.classes?.name || '—'}</td>
                <td style={s.td}>{primary ? `${primary.first_name} ${primary.last_name}` : '—'}</td>
                <td style={s.td}>{primary?.phone || '—'}</td>
                <td style={s.td}>
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

      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>Add learner</div>
            <form onSubmit={save}>
              <div style={s.section}>Learner details</div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>First name *</label>
                  <input style={s.mInput} name="first_name" value={form.first_name} onChange={hf} required />
                </div>
                <div>
                  <label style={s.label}>Last name *</label>
                  <input style={s.mInput} name="last_name" value={form.last_name} onChange={hf} required />
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Date of birth</label>
                  <input style={s.mInput} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} />
                </div>
                <div>
                  <label style={s.label}>Gender</label>
                  <select style={s.mInput} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={s.section}>Parent / Guardian</div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>First name *</label>
                  <input style={s.mInput} name="first_name" value={guardian.first_name} onChange={hg} required />
                </div>
                <div>
                  <label style={s.label}>Last name *</label>
                  <input style={s.mInput} name="last_name" value={guardian.last_name} onChange={hg} required />
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Phone *</label>
                  <input style={s.mInput} name="phone" value={guardian.phone} onChange={hg} required />
                </div>
                <div>
                  <label style={s.label}>Relationship</label>
                  <select style={s.mInput} name="relationship" value={guardian.relationship} onChange={hg}>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </div>
              </div>
              <label style={s.label}>Email</label>
              <input style={s.mInput} name="email" type="email" value={guardian.email} onChange={hg} />

              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save learner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
