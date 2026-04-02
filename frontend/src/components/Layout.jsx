import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/',              label: '📊 Dashboard'      },
  { to: '/learners',      label: '🎒 Learners'       },
  { to: '/fees',          label: '💰 Fees'           },
  { to: '/events',        label: '📅 Events'         },
  { to: '/announcements', label: '📢 Announcements'  },
]

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220, background: '#1d4ed8', color: '#fff',
    display: 'flex', flexDirection: 'column', flexShrink: 0
  },
  brand: {
    padding: '24px 20px 16px', fontSize: 22, fontWeight: 700,
    letterSpacing: '-0.5px', borderBottom: '1px solid rgba(255,255,255,0.15)'
  },
  tagline: { fontSize: 10, fontWeight: 400, opacity: 0.7, display: 'block', marginTop: 2 },
  nav: { flex: 1, padding: '12px 0' },
  link: {
    display: 'block', padding: '10px 20px', color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none', fontSize: 14, borderRadius: 6, margin: '2px 8px',
    transition: 'background 0.15s'
  },
  activeLink: { background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600 },
  footer: { padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 13 },
  logoutBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', padding: 0, fontSize: 13
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  topbar: {
    background: '#fff', borderBottom: '1px solid #e2e8f0',
    padding: '14px 28px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between'
  },
  schoolName: { fontWeight: 600, fontSize: 15, color: '#1e293b' },
  badge: {
    background: '#f1f5f9', color: '#64748b', fontSize: 11,
    padding: '3px 10px', borderRadius: 20, fontWeight: 500
  },
  content: { flex: 1, padding: '28px', overflowY: 'auto' }
}

export default function Layout() {
  const { user, school, logout } = useAuth()

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          Skolo
          <span style={styles.tagline}>Less admin. More learning.</span>
        </div>
        <nav style={styles.nav}>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.footer}>
          <div style={{ marginBottom: 6, opacity: 0.7 }}>{user?.full_name}</div>
          <button style={styles.logoutBtn} onClick={logout}>Sign out →</button>
        </div>
      </aside>

      {/* Main area */}
      <div style={styles.main}>
        <header style={styles.topbar}>
          <span style={styles.schoolName}>{school?.name || '—'}</span>
          <span style={styles.badge}>
            {school?.countries?.currency_symbol} {school?.countries?.currency_code} · {user?.role}
          </span>
        </header>
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
