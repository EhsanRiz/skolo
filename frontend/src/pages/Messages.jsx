import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { t } from '../components/ui'
import api from '../lib/api'

export default function Messages() {
  const { user } = useAuth()
  const toast = useToast()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [parents, setParents] = useState([])
  const [loadingParents, setLoadingParents] = useState(false)
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
      loadConversations()
    } catch { toast.error('Failed to send') }
    setSending(false)
  }

  async function openNewMessage() {
    setShowNew(true)
    setLoadingParents(true)
    try {
      const { data } = await api.get('/messaging/parents')
      setParents(data.parents || [])
    } catch {}
    setLoadingParents(false)
  }

  async function startConversation(parent) {
    try {
      const { data } = await api.post('/messaging/conversations', {
        type: 'direct',
        participant_ids: [parent.id]
      })
      setShowNew(false)
      const conv = data.conversation
      conv.participants = [{ user_id: parent.id, name: parent.full_name, role: 'parent' }]
      setActiveConv(conv)
      loadConversations()
    } catch { toast.error('Failed to start conversation') }
  }

  function getConvName(conv) {
    if (conv.title) return conv.title
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
    if (diff < 86400000 && d.getDate() === now.getDate())
      return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    if (diff < 172800000) return 'Yesterday'
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  // ── New message: parent selection ──
  if (showNew) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setShowNew(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#1d4ed8'
          }}>&larr;</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>New message</h1>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Select a parent to message:</p>

        {loadingParents ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading parents...</div>
        ) : parents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
            No parents have registered yet. Invite parents from Settings &rarr; Parent Invitations.
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            {parents.map((p, i) => (
              <div key={p.id} onClick={() => startConversation(p)} style={{
                display: 'flex', gap: 12, padding: '14px 20px', cursor: 'pointer', alignItems: 'center',
                borderBottom: i < parents.length - 1 ? '1px solid #f1f5f9' : 'none',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: '#1d4ed8', fontSize: 15, flexShrink: 0
                }}>
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{p.full_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {p.email}
                    {p.learners?.length > 0 && (
                      <span style={{ marginLeft: 8, color: '#94a3b8' }}>
                        &middot; {p.learners.map(l => `${l.first_name} ${l.last_name}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 18 }}>&rsaquo;</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Thread view ──
  if (activeConv) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 12, borderRadius: '14px 14px 0 0',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)'
        }}>
          <button onClick={() => { setActiveConv(null); loadConversations() }} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#1d4ed8'
          }}>&larr;</button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#1d4ed8', fontSize: 14, flexShrink: 0
          }}>
            {getConvName(activeConv).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{getConvName(activeConv)}</div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{getConvRole(activeConv)}</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
              Send a message to start the conversation
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user.id
            if (msg.is_system) return (
              <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: '8px 0' }}>
                {msg.body}
              </div>
            )
            return (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8
              }}>
                <div style={{
                  maxWidth: '70%', padding: '10px 14px', borderRadius: 14,
                  background: isMine ? '#0f2044' : '#fff',
                  color: isMine ? '#fff' : '#0f172a',
                  border: isMine ? 'none' : '1px solid #e2e8f0',
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius: isMine ? 14 : 4
                }}>
                  {!isMine && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', marginBottom: 2 }}>
                      {msg.users?.full_name}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                  <div style={{
                    fontSize: 10, marginTop: 4, textAlign: 'right',
                    color: isMine ? 'rgba(255,255,255,0.5)' : '#94a3b8'
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
          padding: '12px 20px', background: '#fff', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 8, borderRadius: '0 0 14px 14px'
        }}>
          <input
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..." autoFocus
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0',
              fontSize: 14, outline: 'none'
            }}
          />
          <button type="submit" disabled={sending || !newMsg.trim()} style={{
            padding: '10px 20px', borderRadius: 24, border: 'none',
            background: '#0f2044', color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', opacity: sending || !newMsg.trim() ? 0.5 : 1
          }}>
            Send
          </button>
        </form>
      </div>
    )
  }

  // ── Conversation list ──
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Messages</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Communicate with parents</p>
        </div>
        <button onClick={openNewMessage} style={{
          ...t.btn.primary, display: 'flex', alignItems: 'center', gap: 6
        }}>
          + New message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>&#128172;</div>
          <div style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>No conversations yet</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            Click <strong>"+ New message"</strong> to start a conversation with a parent
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          {conversations.map((conv, i) => (
            <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
              display: 'flex', gap: 14, padding: '16px 20px', cursor: 'pointer', alignItems: 'center',
              borderBottom: i < conversations.length - 1 ? '1px solid #f1f5f9' : 'none',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: conv.unread_count > 0 ? '#1d4ed8' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: conv.unread_count > 0 ? '#fff' : '#1d4ed8', fontSize: 16, flexShrink: 0
              }}>
                {getConvName(conv).charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: 14, color: '#0f172a' }}>
                    {getConvName(conv)}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 8, textTransform: 'capitalize' }}>
                      {getConvRole(conv)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                    {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <div style={{
                    fontSize: 13, color: '#64748b', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                    fontWeight: conv.unread_count > 0 ? 500 : 400
                  }}>
                    {conv.last_message?.body || 'No messages yet'}
                  </div>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: '#1d4ed8', color: '#fff', fontSize: 10, fontWeight: 700,
                      borderRadius: 10, padding: '2px 8px', marginLeft: 8, flexShrink: 0
                    }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
