import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/',              icon: ChartIcon,        label: 'Dashboard'      },
  { to: '/learners',      icon: UsersIcon,        label: 'Learners'       },
  { to: '/fees',          icon: CurrencyIcon,     label: 'Fees'           },
  { to: '/events',        icon: CalendarIcon,     label: 'Events'         },
  { to: '/announcements', icon: MegaphoneIcon,    label: 'Announcements'  },
  { to: '/settings',      icon: SettingsIcon,     label: 'Settings'       },
]

// SVG Icons
function ChartIcon({ active }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
}
function UsersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function CurrencyIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function CalendarIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function MegaphoneIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
}
function SettingsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

const CSS = `
* { box-sizing: border-box; }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px; margin: 2px 0; transition: all 0.15s; }
.nav-link:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
.nav-link.active { background: rgba(255,255,255,0.15); color: #fff; font-weight: 600; }
.nav-link.active svg { opacity: 1; }
.nav-link svg { opacity: 0.6; flex-shrink: 0; }
.nav-link.active svg { opacity: 1; }
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
`

export default function Layout() {
  const { user, school, logout } = useAuth()
  const sym = school?.countries?.currency_symbol || ''
  const code = school?.countries?.currency_code || ''

  const initials = school?.name
    ? school.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
    : 'S'

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>

        {/* Sidebar */}
        <aside style={{
          width: 232, background: '#0f2044',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          position: 'sticky', top: 0, height: '100vh'
        }}>

          {/* Brand */}
          <div style={{ padding: '24px 20px 20px' }}>
            {school?.logo_url ? (
              <img src={school.logo_url} alt="logo"
                style={{ height: 36, maxWidth: 160, objectFit: 'contain', marginBottom: 8 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, background: '#1d4ed8', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>Skolo</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>One platform. Whole school.</div>
                </div>
              </div>
            )}
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {school?.name || '—'}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              {user?.role} · {sym} {code}
            </div>
            <button onClick={logout} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px 12px',
              borderRadius: 6, fontSize: 12, fontWeight: 500, width: '100%',
              transition: 'all 0.15s'
            }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="main-content">
          {/* Topbar */}
          <header style={{
            background: '#fff', borderBottom: '1px solid #e2e8f0',
            padding: '0 32px', height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
              {school?.name || '—'}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#64748b',
              background: '#f1f5f9', padding: '5px 12px', borderRadius: 20
            }}>
              {sym} {code} · {user?.role}
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
