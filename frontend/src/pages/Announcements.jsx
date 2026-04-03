import { useState, useEffect } from 'react'
import { IconTrash, t } from '../components/ui'
import api from '../lib/api'

const empty = { title: '', body: '', target: 'all', send_sms: false }

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [show,    setShow]    = useState(false)
  const [form,    setForm]    = useState(empty)
  const [saving,  setSaving]  = useState(false)
  const [lastResult, setLast] = useState(null)

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
      setLast(data); setShow(false); setForm(empty); load()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this announcement?')) return
    await api.delete(`/announcements/${id}`); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Announcements</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Send messages and SMS blasts to parents</p>
        </div>
        <button style={t.btn.primary} onClick={() => { setLast(null); setShow(true) }}>+ New announcement</button>
      </div>

      {lastResult && (
        <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
          ✓ Announcement sent{lastResult.sms_queued > 0 ? ` · ${lastResult.sms_queued} SMS messages queued` : ''}.
        </div>
      )}

      {announcements.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          No announcements yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {announcements.map(a => (
          <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                  {new Date(a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{a.target === 'all' ? 'All parents' : a.target}
                  {a.send_sms && <span style={{ marginLeft: 8, background: '#dbeafe', color: '#1d4ed8', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>SMS</span>}
                </div>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{a.body}</div>
              </div>
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', marginLeft: 16, flexShrink: 0, display: 'flex', padding: 4 }}>
                <IconTrash size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {show && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>New announcement</h2>
            <form onSubmit={save}>
              <label style={t.label}>Title *</label>
              <input style={t.input} name="title" value={form.title} onChange={hf} required />
              <label style={t.label}>Message *</label>
              <textarea style={{ ...t.input, resize: 'vertical', minHeight: 100 }} name="body" value={form.body} onChange={hf} required />
              <label style={t.label}>Send to</label>
              <select style={t.input} name="target" value={form.target} onChange={hf}>
                <option value="all">All parents</option>
                <option value="grade">Specific grade</option>
                <option value="class">Specific class</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px', background: '#f8fafc', borderRadius: 9 }}>
                <input type="checkbox" id="sms" name="send_sms" checked={form.send_sms} onChange={hf} style={{ width: 16, height: 16, accentColor: '#1d4ed8' }} />
                <label htmlFor="sms" style={{ fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                  Also send as SMS to parents
                  <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>Africa's Talking integration — activates in next build step</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShow(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Sending…' : 'Send announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
