import { useState, useEffect } from 'react'
import api from '../lib/api'

const EVENT_TYPES = ['academic','sports','meeting','holiday','general']
const TYPE_COLORS = {
  academic: ['#dbeafe','#1d4ed8'],
  sports:   ['#dcfce7','#16a34a'],
  meeting:  ['#fef9c3','#ca8a04'],
  holiday:  ['#fce7f3','#db2777'],
  general:  ['#f1f5f9','#64748b']
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 700 },
  btn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  card: { background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  cardDate: { fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  deleteBtn: { float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 440 },
  mTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' },
  textarea: { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none', resize: 'vertical', minHeight: 80 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  mFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  empty: { color: '#94a3b8', fontSize: 14 }
}

const empty = { title: '', description: '', event_date: '', end_date: '', event_type: 'general' }

export default function Events() {
  const [events, setEvents]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/events').then(r => setEvents(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const hf = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/events', form)
      setShowModal(false); setForm(empty); load()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this event?')) return
    await api.delete(`/events/${id}`); load()
  }

  // Group events by month
  const grouped = events.reduce((acc, ev) => {
    const month = new Date(ev.event_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(ev)
    return acc
  }, {})

  return (
    <div>
      <div style={s.header}>
        <div style={s.heading}>Events</div>
        <button style={s.btn} onClick={() => setShowModal(true)}>+ Add event</button>
      </div>

      {Object.keys(grouped).length === 0 && <div style={s.empty}>No events yet. Add your first school event.</div>}

      {Object.entries(grouped).map(([month, evs]) => (
        <div key={month} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{month}</div>
          <div style={s.grid}>
            {evs.map(ev => {
              const [bg, color] = TYPE_COLORS[ev.event_type] || TYPE_COLORS.general
              return (
                <div key={ev.id} style={s.card}>
                  <button style={s.deleteBtn} onClick={() => remove(ev.id)}>✕</button>
                  <div style={s.cardDate}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.end_date && ev.end_date !== ev.event_date &&
                      ` → ${new Date(ev.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
                    }
                  </div>
                  <div style={s.cardTitle}>{ev.title}</div>
                  {ev.description && <div style={s.cardDesc}>{ev.description}</div>}
                  <span style={{ ...s.badge, background: bg, color }}>{ev.event_type}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {showModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>Add event</div>
            <form onSubmit={save}>
              <label style={s.label}>Title *</label>
              <input style={s.input} name="title" value={form.title} onChange={hf} required />
              <label style={s.label}>Description</label>
              <textarea style={s.textarea} name="description" value={form.description} onChange={hf} />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Start date *</label>
                  <input style={s.input} name="event_date" type="date" value={form.event_date} onChange={hf} required />
                </div>
                <div>
                  <label style={s.label}>End date</label>
                  <input style={s.input} name="end_date" type="date" value={form.end_date} onChange={hf} />
                </div>
              </div>
              <label style={s.label}>Event type</label>
              <select style={s.input} name="event_type" value={form.event_type} onChange={hf}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <div style={s.mFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
