import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

// ─── Navigation items ─────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: DashIcon },
  { to: '/grades',        label: 'Grades',        icon: GradeIcon },
  { to: '/fees',          label: 'Fees',          icon: FeeIcon },
  { to: '/attendance',    label: 'Attendance',    icon: AttendIcon },
  { to: '/timetable',     label: 'Timetable',     icon: ClockIcon },
  { to: '/messages',      label: 'Messages',      icon: MsgIcon },
  { to: '/announcements', label: 'Announcements', icon: MegaIcon },
  { to: '/events',        label: 'Events',        icon: CalIcon },
]

const MOBILE_NAV = [
  { to: '/dashboard',  label: 'Home',     icon: DashIcon },
  { to: '/fees',       label: 'Fees',     icon: FeeIcon },
  { to: '/grades',     label: 'Grades',   icon: GradeIcon },
  { to: '/messages',   label: 'Messages', icon: MsgIcon },
  { to: '/attendance', label: 'Attend',   icon: AttendIcon },
]

// ─── CSS (media queries + nav link styles) ────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.nav-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; color: rgba(255,255,255,0.6);
  text-decoration: none; font-size: 14px; font-weight: 500;
  border-radius: 8px; margin: 2px 0; transition: all 0.15s;
}
.nav-link:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
.nav-link.active { background: rgba(255,255,255,0.15); color: #fff; font-weight: 600; }
.nav-link svg { opacity: 0.6; flex-shrink: 0; }
.nav-link.active svg { opacity: 1; }
.mob-nav-link {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 6px 4px; color: rgba(255,255,255,0.55);
  text-decoration: none; font-size: 10px; font-weight: 500;
  flex: 1; transition: all 0.15s; border-radius: 8px;
}
.mob-nav-link:hover { color: rgba(255,255,255,0.9); }
.mob-nav-link.active { color: #fff; }
.mob-nav-link.active svg { opacity: 1; }
.mob-nav-link svg { opacity: 0.55; }
@media (max-width: 768px) {
  .desktop-sidebar { display: none !important; }
  .mobile-topbar   { display: flex !important; }
  .mobile-bottom   { display: flex !important; }
  .main-padding    { padding: 16px !important; padding-top: 72px !important; padding-bottom: 90px !important; }
  .desktop-topbar  { display: none !important; }
}
@media (min-width: 769px) {
  .desktop-sidebar { display: flex !important; }
  .mobile-topbar   { display: none !important; }
  .mobile-bottom   { display: none !important; }
}
`

// ─── Notification Bell ────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ total_unread: 0, items: [] })
  const ref = useRef()
  const navigate = useNavigate()

  const load = async () => {
    try { const { data: d } = await api.get('/parent-data/notifications'); setData(d) } catch {}
  }

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const typeIcon = { message: '\uD83D\uDCAC', announcement: '\uD83D\uDCE2', fee_overdue: '\uD83D\uDCB0', grade_posted: '\uD83D\uDCCA', attendance_alert: '\uD83D\uDCC5' }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,0.7)', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 8
      }}>
        <BellIcon />
        {data.total_unread > 0 && (
          <span style={{
            position: 'absolute', top: 1, right: 1, width: 16, height: 16, background: '#dc2626',
            borderRadius: 20, fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f2044'
          }}>{data.total_unread > 9 ? '9+' : data.total_unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: '#fff',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.18)', zIndex: 300, overflow: 'hidden', border: '1px solid #e2e8f0'
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Notifications
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {data.items.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>All caught up!</div>
            ) : data.items.map((item, i) => (
              <div key={i} onClick={() => { setOpen(false); navigate(item.link) }} style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, alignItems: 'flex-start',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{typeIcon[item.type] || '\uD83D\uDD14'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{item.body}</div>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginTop: 2 }}>{timeAgo(item.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Layout ──────────────────────────────────────
export default function Layout() {
  const { user, school, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const initials = school?.name
    ? school.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'SP'

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <img src={school?.logo_url || '/skolo-icon-white.svg'} alt={school?.name || 'Skolo'}
            style={{ height: 38, width: 38, objectFit: 'contain', flexShrink: 0, borderRadius: 6 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {school?.name || 'Skolo'}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: 1 }}>Parent Portal</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon />{label}
          </NavLink>
        ))}
      </nav>

      {/* Settings + User footer */}
      <div style={{ padding: '8px 12px 0' }}>
        <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <GearIcon />Settings
        </NavLink>
      </div>
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 1 }}>{user?.full_name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>parent</div>
        <button onClick={() => { logout(); navigate('/login') }} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px 12px',
          borderRadius: 6, fontSize: 12, fontWeight: 500, width: '100%', transition: 'all .15s'
        }}>Sign out</button>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="desktop-sidebar" style={{
          width: 232, background: '#0f2044', flexDirection: 'column',
          flexShrink: 0, position: 'sticky', top: 0, height: '100vh'
        }}>
          <SidebarContent />
        </aside>

        {/* ── MOBILE TOPBAR ── */}
        <div className="mobile-topbar" style={{
          display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#0f2044', height: 56, alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={school?.logo_url || '/skolo-icon-white.svg'} alt={school?.name || 'Skolo'}
              style={{ height: 30, width: 30, objectFit: 'contain', borderRadius: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{school?.name || 'Skolo'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NotificationBell />
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {/* ── MOBILE DRAWER ── */}
        {menuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setMenuOpen(false)}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 260,
              background: '#0f2044', display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Desktop topbar */}
          <header className="desktop-topbar" style={{
            background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{school?.name || 'Parent Portal'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotificationBell />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '5px 12px', borderRadius: 20 }}>
                {school?.countries?.currency_symbol || ''} {school?.countries?.currency_code || ''} · parent
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="main-padding" style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="mobile-bottom" style={{
          display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0f2044', padding: '6px 8px env(safe-area-inset-bottom, 10px)',
          zIndex: 150, justifyContent: 'space-around', alignItems: 'center',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.2)'
        }}>
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `mob-nav-link${isActive ? ' active' : ''}`}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Icons (17×17 stroke SVGs) ────────────────────────
function DashIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg> }
function GradeIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg> }
function FeeIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> }
function AttendIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> }
function ClockIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> }
function MsgIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> }
function MegaIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> }
function CalIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> }
function GearIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> }
function BellIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> }
function HamburgerIcon({ open }) {
  return open
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
}
