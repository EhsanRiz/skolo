import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

const COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', text: '#14532d' },
  error:   { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', text: '#7f1d1d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', text: '#78350f' },
  info:    { bg: '#f0f5fa', border: '#c6dae7', icon: '#003049', text: '#003049' },
}

const CSS = `
@keyframes toastIn {
  from { opacity: 0; transform: translateX(110%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(110%); }
}
`

function ToastItem({ id, message, type, removing }) {
  const c = COLORS[type] || COLORS.info
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '13px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      maxWidth: 360, width: '100%',
      animation: `${removing ? 'toastOut' : 'toastIn'} 0.3s cubic-bezier(0.16,1,0.3,1) both`,
      marginBottom: 8
    }}>
      <div style={{ fontWeight: 700, color: c.icon, fontSize: 15, flexShrink: 0, marginTop: 1 }}>
        {ICONS[type]}
      </div>
      <div style={{ fontSize: 14, color: c.text, fontWeight: 500, lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type, removing: false }])
    setTimeout(() => {
      setToasts(t => t.map(x => x.id === id ? { ...x, removing: true } : x))
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 300)
    }, duration)
  }, [])

  const toast = {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error',   dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info:    (msg, dur) => show(msg, 'info',    dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      <style>{CSS}</style>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
