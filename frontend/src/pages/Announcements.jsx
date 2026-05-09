import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { IconTrash, t } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import api, { errMessage } from '../lib/api'

const empty = { title: '', body: '', target: 'all', send_sms: false }

const CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.ann-bubble {
  background: #fff; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  animation: fadeUp .3s ease both;
  transition: box-shadow .15s, transform .15s;
  cursor: pointer; position: relative;
}
.ann-bubble:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-1px); }
.ann-bubble.expanded { cursor: default; }
.ann-bubble.expanded:hover { transform: none; }
.ann-body-collapsed {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; text-overflow: ellipsis;
}
.ann-body-expanded { }
.ann-meta-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20; font-size: 11px; font-weight: 600;
}
`

// Type/color mapping for announcement badges
const TARGET_STYLE = {
  all:   { bg: '#e6eff5', color: '#003049', label: 'All parents', icon: '📢' },
  grade: { bg: '#faf5ff', color: '#7c3aed', label: 'Grade', icon: '🎓' },
  class: { bg: '#fef4d6', color: '#b8870a', label: 'Class', icon: '🏫' },
}

function ConfirmModal({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onCancel}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)' }} />
      <div style={{
        position:'relative', background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:400, width:'90%',
        boxShadow:'0 20px 60px rgba(0,0,0,.2)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight:800, fontSize:17, color:'#1f2937', marginBottom:8 }}>{title || 'Confirm'}</div>
        <div style={{ fontSize:14, color:'#6b7280', lineHeight:1.6, marginBottom:24 }}>{message}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{
            padding:'9px 18px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff',
            fontSize:13, fontWeight:600, cursor:'pointer', color:'#374151', fontFamily:'inherit'
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding:'9px 18px', borderRadius:8, border:'none',
            background: danger ? '#dc2626' : '#003049', color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
          }}>{confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Announcements() {
  const { user } = useAuth()
  const toast = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLast] = useState(null)
  const [expanded, setExpanded] = useState({}) // id → bool
  const [confirmModal, setConfirmModal] = useState({ open: false })

  const isAdmin = user?.role === 'admin' || user?.role === 'principal'

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
      toast.success('Announcement sent!')
    } catch (err) { toast.error(errMessage(err, 'Failed')) }
    finally { setSaving(false) }
  }

  const remove = (id) => {
    setConfirmModal({
      open: true,
      title: 'Delete announcement',
      message: 'Are you sure? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmModal({ open: false })
        try { await api.delete(`/announcements/${id}`); load(); toast.success('Deleted') }
        catch (err) { toast.error(errMessage(err, 'Failed to delete')) }
      }
    })
  }

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <style>{CSS}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>Announcements</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Send messages and SMS blasts to parents</p>
        </div>
        {isAdmin && (
          <button style={t.btn.primary} onClick={() => { setLast(null); setShow(true) }}>+ New announcement</button>
        )}
      </div>

      {lastResult && (
        <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 12, padding: '12px 18px', marginBottom: 20, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          Announcement sent{lastResult.sms_queued > 0 ? ` · ${lastResult.sms_queued} SMS messages queued` : ''}.
        </div>
      )}

      {announcements.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No announcements yet</div>
          {isAdmin && <div style={{ fontSize: 13, marginTop: 6 }}>Create one to get started.</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {announcements.map((a, idx) => {
          const isExpanded = !!expanded[a.id]
          const isLong = (a.body || '').length > 150
          const ts = TARGET_STYLE[a.target] || TARGET_STYLE.all

          return (
            <div key={a.id}
              className={`ann-bubble${isExpanded ? ' expanded' : ''}`}
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => !isExpanded && isLong && toggleExpand(a.id)}>

              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {ts.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{a.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(a.created_at)}</span>
                      <span style={{ background: ts.bg, color: ts.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {ts.label}
                      </span>
                      {a.send_sms && (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          SMS ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); remove(a.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 6, borderRadius: 8, transition: 'color .15s', flexShrink: 0 }}
                    onMouseEnter={e => e.target.style.color = '#ef4444'}
                    onMouseLeave={e => e.target.style.color = '#d1d5db'}>
                    <IconTrash size={15} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className={isExpanded || !isLong ? 'ann-body-expanded' : 'ann-body-collapsed'}
                style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginLeft: 46 }}>
                {a.body}
              </div>

              {/* Expand/collapse hint */}
              {isLong && (
                <div
                  onClick={(e) => { e.stopPropagation(); toggleExpand(a.id) }}
                  style={{ marginLeft: 46, marginTop: 6, fontSize: 12, color: '#003049', fontWeight: 600, cursor: 'pointer' }}>
                  {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                </div>
              )}

              {/* Date footer */}
              <div style={{ marginLeft: 46, marginTop: 10, fontSize: 11, color: '#d1d5db' }}>
                {new Date(a.created_at).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>

      {/* New announcement modal */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: 9 }}>
                <input type="checkbox" id="sms" name="send_sms" checked={form.send_sms} onChange={hf} style={{ width: 16, height: 16, accentColor: '#003049' }} />
                <label htmlFor="sms" style={{ fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                  Also send as SMS to parents
                  <span style={{ display: 'block', fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>Africa's Talking integration — activates in next build step</span>
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

      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal({ open: false })} />
    </div>
  )
}
