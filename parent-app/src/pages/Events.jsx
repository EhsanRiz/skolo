import { useState, useEffect } from 'react'
import api from '../lib/api'

const EVENT_COLORS = {
  academic: { bg: '#e6eff5', color: '#003049', icon: '&#128218;' },
  sports: { bg: '#ecfdf5', color: '#059669', icon: '&#9917;' },
  meeting: { bg: '#fef4d6', color: '#d97706', icon: '&#128101;' },
  holiday: { bg: '#fce7f3', color: '#db2777', icon: '&#127881;' },
  general: { bg: '#f7f7f7', color: '#4b5563', icon: '&#128197;' }
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data } = await api.get('/parent-data/events')
      setEvents(data.events || [])
    } catch {}
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>

  // Group events by month
  const grouped = {}
  events.forEach(ev => {
    const key = new Date(ev.event_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  })

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' }}>Events</h1>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
          No upcoming events
        </div>
      ) : (
        Object.entries(grouped).map(([month, monthEvents]) => (
          <div key={month} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {month}
            </div>
            {monthEvents.map(ev => {
              const ec = EVENT_COLORS[ev.event_type] || EVENT_COLORS.general
              const date = new Date(ev.event_date)

              return (
                <div key={ev.id} style={{
                  background: '#fff', borderRadius: 12, padding: 14,
                  border: '1px solid #e5e7eb', marginBottom: 8,
                  display: 'flex', gap: 12, alignItems: 'flex-start'
                }}>
                  {/* Date badge */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 10, background: ec.bg,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: ec.color, lineHeight: 1 }}>
                      {date.getDate()}
                    </div>
                    <div style={{ fontSize: 10, color: ec.color, fontWeight: 500 }}>
                      {date.toLocaleDateString('en-ZA', { weekday: 'short' })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{ev.title}</div>
                    {ev.description && (
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {ev.description.length > 100 ? ev.description.slice(0, 100) + '...' : ev.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                        background: ec.bg, color: ec.color, textTransform: 'capitalize'
                      }}>
                        {ev.event_type || 'general'}
                      </span>
                      {ev.end_date && ev.end_date !== ev.event_date && (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          until {new Date(ev.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
