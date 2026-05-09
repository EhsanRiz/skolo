import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, { errMessage } from '../lib/api'

export default function Profile() {
  const { user, refreshDashboard } = useAuth()
  const [guardian, setGuardian] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // Profile form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data } = await api.get('/parent-data/dashboard')
      const g = data.guardian
      setGuardian(g)
      setFirstName(g.first_name || '')
      setLastName(g.last_name || '')
      setPhone(g.phone || '')
      setEmail(g.email || '')
    } catch {}
    setLoading(false)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.patch('/parent-data/profile', { first_name: firstName, last_name: lastName, phone, email })
      setMsg({ type: 'success', text: 'Profile updated successfully' })
      refreshDashboard()
    } catch (err) {
      setMsg({ type: 'error', text: errMessage(err, 'Failed to update') })
    }
    setSaving(false)
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg(null)

    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'Passwords do not match' }); return }
    if (newPw.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return }

    setPwSaving(true)
    try {
      await api.post('/parent-data/change-password', { current_password: currentPw, new_password: newPw })
      setPwMsg({ type: 'success', text: 'Password changed successfully' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwMsg({ type: 'error', text: errMessage(err, 'Failed to change password') })
    }
    setPwSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 20px' }}>Profile & Settings</h1>

      {/* Personal Information */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937', marginBottom: 16 }}>Personal Information</div>

        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: msg.type === 'success' ? '#15803d' : '#dc2626'
          }}>{msg.text}</div>
        )}

        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>First name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Last name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} required />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
          </div>
          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: '#003049', color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', opacity: saving ? 0.6 : 1
          }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937', marginBottom: 16 }}>Change Password</div>

        {pwMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: pwMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: pwMsg.type === 'success' ? '#15803d' : '#dc2626'
          }}>{pwMsg.text}</div>
        )}

        <form onSubmit={changePassword}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Current password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>New password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} required minLength={6} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Confirm new password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} required />
          </div>
          <button type="submit" disabled={pwSaving} style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: '1.5px solid #003049', background: '#fff', color: '#003049',
            fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: pwSaving ? 0.6 : 1
          }}>
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 12 }}>
        Signed in as {user?.email}
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e5e7eb', marginBottom: 12
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #e5e7eb', fontSize: 14, outline: 'none',
  boxSizing: 'border-box'
}
