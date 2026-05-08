import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [staff, setStaff] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    loadConversations()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id)
      markAsRead(activeConv.id)
      // Poll for new messages every 5 seconds
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeConv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    try {
      const { data } = await api.get('/messaging/conversations')
      setConversations(data.conversations || [])
    } catch {}
    setLoading(false)
  }

  async function loadMessages(convId) {
    try {
      const { data } = await api.get(`/messaging/conversations/${convId}/messages`)
      setMessages(data.messages || [])
    } catch {}
  }

  async function markAsRead(convId) {
    try { await api.patch(`/messaging/conversations/${convId}/read`) } catch {}
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMsg.trim() || !activeConv) return
    setSending(true)
    try {
      await api.post(`/messaging/conversations/${activeConv.id}/messages`, { body: newMsg.trim() })
      setNewMsg('')
      await loadMessages(activeConv.id)
      // Update conversation list
      loadConversations()
    } catch {}
    setSending(false)
  }

  async function openNewMessage() {
    setShowNewMsg(true)
    setLoadingStaff(true)
    try {
      const { data } = await api.get('/messaging/staff')
      setStaff(data.staff || [])
    } catch {}
    setLoadingStaff(false)
  }

  async function startConversation(staffMember) {
    try {
      const { data } = await api.post('/messaging/conversations', {
        type: 'direct',
        participant_ids: [staffMember.id]
      })
      setShowNewMsg(false)
      const conv = data.conversation
      // Add participant info so getConvName works
      conv.participants = [{ user_id: staffMember.id, name: staffMember.full_name, role: staffMember.role }]
      setActiveConv(conv)
      loadConversations()
    } catch {}
  }

  function getConvName(conv) {
    if (conv.title) return conv.title
    // For direct messages, show the other person's name
    const other = conv.participants?.find(p => p.user_id !== user.id)
    return other?.name || 'Conversation'
  }

  function getConvRole(conv) {
    const other = conv.participants?.find(p => p.user_id !== user.id)
    return other?.role || ''
  }

  function formatTime(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 172800000) return 'Yesterday'
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  function getRoleLabel(role) {
    const labels = { admin: 'Admin', principal: 'Principal', bursar: 'Bursar', teacher: 'Teacher' }
    return labels[role] || role
  }

  function getRoleColor(role) {
    const colors = { admin: '#7c3aed', principal: '#0f766e', bursar: '#003049', teacher: '#c2410c' }
    return colors[role] || '#6b7280'
  }

  // Staff selection modal
  if (showNewMsg) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setShowNewMsg(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#003049', fontSize: 18
          }}>&#8592;</button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>New message</h1>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Select a staff member to message:</p>

        {loadingStaff ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
        ) : staff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>
            No staff members available
          </div>
        ) : (
          staff.map(s => (
            <div key={s.id} onClick={() => startConversation(s)} style={{
              display: 'flex', gap: 12, padding: '14px 16px', background: '#fff',
              borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 8,
              cursor: 'pointer', alignItems: 'center'
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', background: '#f0f5fa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#003049', fontSize: 16, flexShrink: 0
              }}>
                {s.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{s.full_name}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: getRoleColor(s.role),
                  background: getRoleColor(s.role) + '15', padding: '2px 8px', borderRadius: 10,
                  textTransform: 'capitalize', display: 'inline-block', marginTop: 2
                }}>
                  {getRoleLabel(s.role)}
                </span>
              </div>
              <div style={{ color: '#d1d5db', fontSize: 18 }}>&#8250;</div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Thread view
  if (activeConv) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)', margin: '-16px -16px 0' }}>
        {/* Thread header */}
        <div style={{
          padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <button onClick={() => { setActiveConv(null); loadConversations() }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#003049', fontSize: 18
          }}>
            &#8592;
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{getConvName(activeConv)}</div>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{getConvRole(activeConv)}</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#fafafa' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>
              Send a message to start the conversation
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user.id
            if (msg.is_system) return (
              <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: '8px 0' }}>
                {msg.body}
              </div>
            )
            return (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8
              }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  background: isMine ? '#003049' : '#fff',
                  color: isMine ? '#fff' : '#1f2937',
                  border: isMine ? 'none' : '1px solid #e5e7eb',
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius: isMine ? 14 : 4
                }}>
                  {!isMine && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#003049', marginBottom: 2 }}>
                      {msg.users?.full_name}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                  <div style={{
                    fontSize: 10, marginTop: 4, textAlign: 'right',
                    color: isMine ? 'rgba(255,255,255,0.6)' : '#9ca3af'
                  }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{
          padding: '10px 16px', background: '#fff', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 8
        }}>
          <input
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..." autoFocus
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #e5e7eb',
              fontSize: 14, outline: 'none'
            }}
          />
          <button type="submit" disabled={sending || !newMsg.trim()} style={{
            padding: '10px 16px', borderRadius: 20, border: 'none',
            background: '#003049', color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', opacity: sending || !newMsg.trim() ? 0.5 : 1
          }}>
            Send
          </button>
        </form>
      </div>
    )
  }

  // Conversation list view
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Messages</h1>
        <button onClick={openNewMessage} style={{
          padding: '8px 16px', borderRadius: 20, border: 'none',
          background: '#003049', color: '#fff', fontWeight: 600, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>&#128172;</div>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>No messages yet</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
            Tap <strong>"+ New message"</strong> to contact your school
          </div>
        </div>
      ) : (
        conversations.map(conv => (
          <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
            display: 'flex', gap: 12, padding: '14px 16px', background: '#fff',
            borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 8,
            cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s'
          }}>
            {/* Avatar */}
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: '#f0f5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#003049', fontSize: 16, flexShrink: 0
            }}>
              {getConvName(conv).charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: 14, color: '#1f2937' }}>
                  {getConvName(conv)}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                  {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{
                  fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                  fontWeight: conv.unread_count > 0 ? 500 : 400
                }}>
                  {conv.last_message?.body || 'No messages yet'}
                </div>
                {conv.unread_count > 0 && (
                  <span style={{
                    background: '#003049', color: '#fff', fontSize: 10, fontWeight: 700,
                    borderRadius: 10, padding: '2px 7px', marginLeft: 8, flexShrink: 0
                  }}>
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
