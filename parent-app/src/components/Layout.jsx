import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import api from '../lib/api'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/fees', label: 'Fees', icon: FeesIcon },
  { to: '/attendance', label: 'Attendance', icon: AttendanceIcon },
  { to: '/announcements', label: 'News', icon: NewsIcon },
  { to: '/messages', label: 'Messages', icon: MessagesIcon },
]

export default function Layout() {
  const { user, school, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadUnread() {
    try {
      const { data } = await api.get('/messaging/unread-count')
      setUnreadMessages(data.count || 0)
    } catch {}
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navLinkStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    textDecoration: 'none', fontSize: 11, fontWeight: isActive ? 600 : 400,
    color: isActive ? '#1d4ed8' : '#64748b',
    padding: '6px 0', flex: 1, position: 'relative',
    transition: 'color 0.15s'
  })

  return (
    <div style={{ minHeight: '100vh', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top header */}
      <header style={{
        background: '#0f2044', color: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {school?.logo_url && (
            <img src={school.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{school?.name || 'Skolo Parent'}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Parent Portal</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10" cy="10" r="8" /><path d="M10 7v0M10 10v3" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position: 'absolute', right: 0, top: 40, background: '#fff', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 180, zIndex: 100, overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{user?.full_name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{user?.email}</div>
                </div>
                <button onClick={() => { setShowMenu(false); navigate('/profile') }} style={{
                  width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                  color: '#0f172a', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  Profile & Settings
                </button>
                <button onClick={handleLogout} style={{
                  width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                  color: '#dc2626', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 500
                }}>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '16px 16px 90px' }}>
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '6px 0 env(safe-area-inset-bottom, 8px)',
        zIndex: 100
      }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => navLinkStyle(isActive)}>
            {({ isActive }) => (
              <>
                <item.icon active={isActive} />
                {item.label === 'Messages' && unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: '50%', transform: 'translateX(12px)',
                    background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700,
                    borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center'
                  }}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────
function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L11 4l8 6.5" /><path d="M5 9.5V18a1 1 0 001 1h3.5v-4.5a1 1 0 011-1h1a1 1 0 011 1V19H16a1 1 0 001-1V9.5" />
    </svg>
  )
}

function FeesIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="13" rx="2" /><path d="M3 9h16" /><path d="M7 13h4" />
    </svg>
  )
}

function AttendanceIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="16" height="15" rx="2" /><path d="M3 8h16" /><path d="M8 4V2" /><path d="M14 4V2" />
      <path d="M8 12l2 2 4-4" />
    </svg>
  )
}

function NewsIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h10v14H4z" /><path d="M14 8h3v10H7" /><path d="M7 8h4" /><path d="M7 11h4" /><path d="M7 14h2" />
    </svg>
  )
}

function MessagesIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h14a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V6a1 1 0 011-1z" /><path d="M8 9h6" /><path d="M8 12h3" />
    </svg>
  )
}
