import { useState, useEffect } from 'react'
import api from '../lib/api'

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 700 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 700 },
  cardMeta: { fontSize: 12, color: '#94a3b8' },
  cardBody: { fontSize: 14, color: '#374151', lineHeight: 1.6 },
  smsBadge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a', marginTop: 8 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 480 },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  textarea: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none', resize: 'vertical', minHeight: 100 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkLabel: { fontSize: 14, color: '#374151' },
  smsNote: { fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 16 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  empty: { color: '#94a3b8', fontSize: 14 }
}

const empty = { title: '', body: '', target: 'all', send_sms: false }

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState(empty)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const load = () => api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const hf = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [e.target.name]: val }))
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await api.post('/announcements', form)
      setLastResult(data)
      setShowModal(false); setForm(empty); load()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this announcement?')) return
    await api.delete(`/announcements/${id}`); load()
  }

  return (
    <div>
      <div style={s.header}>
        <div style={s.heading}>Announcements</div>
        <button style={s.btn} onClick={() => { setLastResult(null); setShowModal(true) }}>+ New announcement</button>
      </div>

      {lastResult && (
        <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          ✅ Announcement sent. {lastResult.sms_queued > 0 ? `${lastResult.sms_queued} SMS messages queued.` : ''}
        </div>
      )}

      {announcements.length === 0 && <div style={s.empty}>No announcements yet.</div>}

      {announcements.map(a => (
        <div key={a.id} style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.cardTitle}>{a.title}</div>
              <div style={s.cardMeta}>
                {new Date(a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}{a.target === 'all' ? 'All parents' : a.target}
              </div>
            </div>
            <button style={s.deleteBtn} onClick={() => remove(a.id)}>✕</button>
          </div>
          <div style={s.cardBody}>{a.body}</div>
          {a.send_sms && <div style={s.smsBadge}>📱 SMS sent</div>}
        </div>
      ))}

      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>New announcement</div>
            <form onSubmit={save}>
              <label style={s.label}>Title *</label>
              <input style={s.input} name="title" value={form.title} onChange={hf} required />
              <label style={s.label}>Message *</label>
              <textarea style={s.textarea} name="body" value={form.body} onChange={hf} required />
              <label style={s.label}>Send to</label>
              <select style={s.input} name="target" value={form.target} onChange={hf}>
                <option value="all">All parents</option>
                <option value="grade">Specific grade</option>
                <option value="class">Specific class</option>
              </select>
              <div style={s.checkRow}>
                <input type="checkbox" name="send_sms" checked={form.send_sms} onChange={hf} id="sms" />
                <label style={s.checkLabel} htmlFor="sms">Also send as SMS to parents</label>
              </div>
              {form.send_sms && (
                <div style={s.smsNote}>
                  📱 SMS will be queued for all matching guardians. Africa's Talking integration activates in the next build step.
                </div>
              )}
              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Sending…' : 'Send announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
