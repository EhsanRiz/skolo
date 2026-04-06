import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data } = await api.get('/parent-data/announcements')
      setAnnouncements(data.announcements || [])
    } catch {}
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Announcements</h1>

      {announcements.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 }}>
          No announcements yet
        </div>
      ) : (
        announcements.map(a => (
          <div key={a.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0, flex: 1 }}>{a.title}</h3>
              {a.target !== 'all' && (
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                  background: '#eff6ff', color: '#1d4ed8', flexShrink: 0, marginLeft: 8
                }}>
                  {a.target}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>
              {a.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {new Date(a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {a.users?.full_name && (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>by {a.users.full_name}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e2e8f0', marginBottom: 10
}
