import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/',              label: 'Dashboard',     icon: DashIcon    },
  { to: '/learners',      label: 'Learners',      icon: UsersIcon   },
  { to: '/fees',          label: 'Fees',          icon: FeeIcon     },
  { to: '/events',        label: 'Events',        icon: CalIcon     },
  { to: '/announcements', label: 'Announcements', icon: SendIcon    },
  { to: '/settings',      label: 'Settings',      icon: GearIcon    },
]

function DashIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> }
function UsersIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function FeeIcon()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function CalIcon()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function SendIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> }
function GearIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }

function HamburgerIcon({ open }) {
  return open
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
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

/* Mobile nav link — horizontal bottom bar */
.mob-nav-link {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px; color: rgba(255,255,255,0.55);
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
  .main-padding    { padding: 16px !important; padding-bottom: 80px !important; }
}
@media (min-width: 769px) {
  .desktop-sidebar { display: flex !important; }
  .mobile-topbar   { display: none !important; }
  .mobile-bottom   { display: none !important; }
}
`

export default function Layout() {
  const { user, school, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const sym = school?.countries?.currency_symbol || ''
  const code = school?.countries?.currency_code || ''
  const initials = school?.name
    ? school.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
    : 'S'

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px' }}>
        {school?.logo_url ? (
          /* School has a logo — show it prominently */
          <div style={{ marginBottom:12 }}>
            <img src={school.logo_url} alt={school.name}
              style={{ maxHeight:52, maxWidth:180, objectFit:'contain', display:'block' }} />
          </div>
        ) : (
          /* No logo — show Skolo wordmark + initials */
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, background:'#1d4ed8', borderRadius:8,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.3px', lineHeight:1.2 }}>Skolo</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>One platform. Whole school.</div>
            </div>
          </div>
        )}
        <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.45)',
          paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {school?.name || '—'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'4px 12px', overflowY:'auto' }}>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to==='/'} className={({isActive}) => `nav-link${isActive?' active':''}`}>
            <Icon />{label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', marginBottom:1 }}>
          {user?.full_name}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>
          {user?.role} · {sym} {code}
        </div>
        <button onClick={logout} style={{
          background:'none', border:'1px solid rgba(255,255,255,0.15)',
          color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:'6px 12px',
          borderRadius:6, fontSize:12, fontWeight:500, width:'100%', transition:'all .15s'
        }}>
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:'flex', minHeight:'100vh', background:'#f1f5f9' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="desktop-sidebar" style={{
          width:232, background:'#0f2044', flexDirection:'column',
          flexShrink:0, position:'sticky', top:0, height:'100vh'
        }}>
          <SidebarContent />
        </aside>

        {/* ── MOBILE TOPBAR ── */}
        <div className="mobile-topbar" style={{
          display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200,
          background:'#0f2044', height:56, alignItems:'center',
          justifyContent:'space-between', padding:'0 16px', flexShrink:0
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {school?.logo_url ? (
              <img src={school.logo_url} alt={school?.name}
                style={{ height:30, maxWidth:100, objectFit:'contain' }} />
            ) : (
              <div style={{ width:30, height:30, background:'#1d4ed8', borderRadius:7,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:800, color:'#fff' }}>
                {initials}
              </div>
            )}
            <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{school?.name || 'Skolo'}</div>
          </div>
          <button onClick={() => setMenuOpen(o=>!o)}
            style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:4 }}>
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>

        {/* ── MOBILE DRAWER OVERLAY ── */}
        {menuOpen && (
          <div style={{ position:'fixed', inset:0, zIndex:190 }}
            onClick={() => setMenuOpen(false)}>
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)' }} />
            <div style={{ position:'absolute', top:0, left:0, bottom:0, width:260,
              background:'#0f2044', display:'flex', flexDirection:'column' }}
              onClick={e => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* ── MAIN AREA ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

          {/* Desktop topbar */}
          <header style={{
            background:'#fff', borderBottom:'1px solid #e2e8f0',
            padding:'0 32px', height:60,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0
          }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>
              {school?.name || '—'}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'#64748b',
              background:'#f1f5f9', padding:'5px 12px', borderRadius:20 }}>
              {sym} {code} · {user?.role}
            </div>
          </header>

          {/* Page content */}
          <main className="main-padding" style={{ flex:1, padding:'28px', overflowY:'auto' }}>
            <Outlet />
          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="mobile-bottom" style={{
          display:'none', position:'fixed', bottom:0, left:0, right:0,
          background:'#0f2044', padding:'6px 8px 10px',
          zIndex:150, justifyContent:'space-around', alignItems:'center',
          boxShadow:'0 -2px 12px rgba(0,0,0,0.2)'
        }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to==='/'} className={({isActive}) => `mob-nav-link${isActive?' active':''}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  )
}
