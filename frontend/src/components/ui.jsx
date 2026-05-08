// Shared SVG action icons — professional, no emoji

export function IconEye({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export function IconEdit({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

export function IconTrash({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

export function IconUpload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}

// Shared status badge colours — Modern Academic palette
export const STATUS_COLORS = {
  paid:     { bg: '#dcfce7', color: '#15803d' },
  partial:  { bg: '#fef4d6', color: '#b8870a' },
  unpaid:   { bg: '#fee2e2', color: '#dc2626' },
  'no fees':{ bg: '#f3f4f6', color: '#6b7280' },
  active:   { bg: '#dcfce7', color: '#15803d' },
  trial:    { bg: '#fef4d6', color: '#b8870a' },
  suspended:{ bg: '#fee2e2', color: '#dc2626' },
}

export function Badge({ status, label }) {
  const c = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, background: c.bg, color: c.color
    }}>
      {label || status}
    </span>
  )
}

// Table action button
export function ActionBtn({ onClick, title, children, variant = 'default' }) {
  const colors = {
    default: { color: '#6b7280', hover: '#e6eff5' },
    danger:  { color: '#dc2626', hover: '#fef2f2' },
  }
  const c = colors[variant]
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, border: '1px solid #e5e7eb', borderRadius: 6,
        background: '#fff', color: c.color, cursor: 'pointer',
        marginLeft: 4, transition: 'all 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.borderColor = c.color }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}
    >
      {children}
    </button>
  )
}

// Shared CSS — paste into index.html or a global style tag
// Modern Academic palette: Navy #003049, Soft Gray #F7F7F7, Sky Blue #669BBC, Amber #F7C548
export const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #f7f7f7; color: #1f2937; -webkit-font-smoothing: antialiased; }
input, select, textarea, button { font-family: inherit; }
input:focus, select:focus, textarea:focus { border-color: #669bbc !important; outline: none; box-shadow: 0 0 0 3px rgba(102,155,188,0.15); }
`

// Design tokens — Modern Academic palette
export const t = {
  // Brand colors
  primary: '#003049',         // Navy — primary CTAs, headings, sidebar
  primaryHover: '#00253a',    // Navy hover
  accent: '#669bbc',          // Sky Blue — secondary accents, active states
  accentSoft: '#e6eff5',      // Sky Blue tint — backgrounds, hovers
  attention: '#f7c548',       // Amber — urgent attention only
  attentionSoft: '#fef4d6',   // Amber tint
  attentionDark: '#b8870a',   // Amber text
  danger: '#dc2626',
  success: '#16a34a',

  // Surfaces
  bg: '#f7f7f7',              // Soft Gray — page background
  cardBg: '#ffffff',
  border: '#e5e7eb',

  // Text
  text: '#1f2937',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',

  // Shared input style
  input: {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #e5e7eb', borderRadius: 9,
    fontSize: 14, outline: 'none', marginBottom: 14,
    background: '#fff', color: '#1f2937', transition: 'border-color 0.15s'
  },

  // Card
  card: {
    background: '#fff', borderRadius: 14,
    boxShadow: '0 1px 3px rgba(0,48,73,0.06), 0 1px 2px rgba(0,48,73,0.04)',
    padding: '24px'
  },

  // Table
  th: {
    textAlign: 'left', padding: '11px 16px',
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    background: '#f3f4f6', textTransform: 'uppercase', letterSpacing: '0.6px'
  },
  td: {
    padding: '13px 16px', fontSize: 14,
    borderTop: '1px solid #f3f4f6', color: '#374151'
  },

  // Buttons
  btn: {
    primary: {
      padding: '9px 18px', background: '#003049', color: '#fff',
      border: 'none', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 14
    },
    ghost: {
      padding: '9px 18px', background: '#f3f4f6', color: '#374151',
      border: 'none', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 14
    },
    accent: {
      padding: '9px 18px', background: '#e6eff5', color: '#003049',
      border: 'none', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 14
    },
    attention: {
      padding: '9px 18px', background: '#f7c548', color: '#003049',
      border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 14,
      boxShadow: '0 2px 8px rgba(247,197,72,0.35)'
    },
    danger: {
      padding: '9px 18px', background: '#fee2e2', color: '#dc2626',
      border: '1px solid #fca5a5', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 14
    }
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,48,73,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    backdropFilter: 'blur(2px)'
  },
  modal: {
    background: '#fff', borderRadius: 18, padding: '32px',
    width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 60px rgba(0,48,73,0.2)'
  },

  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, marginTop: 20 },
}
