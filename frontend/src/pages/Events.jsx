import { useState, useEffect } from 'react'
import { IconTrash, t } from '../components/ui'
import api from '../lib/api'

const TYPE_COLORS = {
  academic: { bg: '#e6eff5', color: '#003049', dot: '#003049' },
  sports:   { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
  meeting:  { bg: '#fef4d6', color: '#b8870a', dot: '#ca8a04' },
  holiday:  { bg: '#fce7f3', color: '#be185d', dot: '#db2777' },
  general:  { bg: '#f7f7f7', color: '#4b5563', dot: '#6b7280' },
}
const TYPES = ['academic','sports','meeting','holiday','general']
const empty = { title: '', description: '', event_date: '', end_date: '', event_type: 'general' }

export default function Events() {
  const [events, setEvents]   = useState([])
  const [show,   setShow]     = useState(false)
  const [form,   setForm]     = useState(empty)
  const [saving, setSaving]   = useState(false)

  const load = () => api.get('/events').then(r => setEvents(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const hf = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/events', form); setShow(false); setForm(empty); load() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this event?')) return
    await api.delete(`/events/${id}`); load()
  }

  const grouped = events.reduce((acc, ev) => {
    const month = new Date(ev.event_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(ev)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>Events</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>School calendar — terms, sports, meetings and holidays</p>
        </div>
        <button style={t.btn.primary} onClick={() => setShow(true)}>+ Add event</button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          No events yet. Add your first school event.
        </div>
      )}

      {Object.entries(grouped).map(([month, evs]) => (
        <div key={month} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {month}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {evs.map(ev => {
              const c = TYPE_COLORS[ev.event_type] || TYPE_COLORS.general
              return (
                <div key={ev.id} style={{
                  background: '#fff', borderRadius: 12, padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${c.dot}`, position: 'relative'
                }}>
                  <button onClick={() => remove(ev.id)} style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#d1d5db', padding: 0, display: 'flex'
                  }}><IconTrash size={14} /></button>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.end_date && ev.end_date !== ev.event_date &&
                      ` – ${new Date(ev.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 6, paddingRight: 20 }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>{ev.description}</div>}
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
                    {ev.event_type}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {show && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>Add event</h2>
            <form onSubmit={save}>
              <label style={t.label}>Title *</label>
              <input style={t.input} name="title" value={form.title} onChange={hf} required />
              <label style={t.label}>Description</label>
              <textarea style={{ ...t.input, resize: 'vertical', minHeight: 80 }} name="description" value={form.description} onChange={hf} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>Start date *</label><input style={t.input} name="event_date" type="date" value={form.event_date} onChange={hf} required /></div>
                <div><label style={t.label}>End date</label><input style={t.input} name="end_date" type="date" value={form.end_date} onChange={hf} /></div>
              </div>
              <label style={t.label}>Event type</label>
              <select style={t.input} name="event_type" value={form.event_type} onChange={hf}>
                {TYPES.map(tp => <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={() => setShow(false)}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
