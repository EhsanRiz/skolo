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

  // Thread view
  if (activeConv) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)', margin: '-16px -16px 0' }}>
        {/* Thread header */}
        <div style={{
          padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <button onClick={() => { setActiveConv(null); loadConversations() }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#1d4ed8', fontSize: 18
          }}>
            &#8592;
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{getConvName(activeConv)}</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{getConvRole(activeConv)}</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f8fafc' }}>
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
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  background: isMine ? '#1d4ed8' : '#fff',
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
                  <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                  <div style={{
                    fontSize: 10, marginTop: 4, textAlign: 'right',
                    color: isMine ? 'rgba(255,255,255,0.6)' : '#94a3b8'
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
          padding: '10px 16px', background: '#fff', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 8
        }}>
          <input
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..." autoFocus
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #e2e8f0',
              fontSize: 14, outline: 'none'
            }}
          />
          <button type="submit" disabled={sending || !newMsg.trim()} style={{
            padding: '10px 16px', borderRadius: 20, border: 'none',
            background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', opacity: sending || !newMsg.trim() ? 0.5 : 1
          }}>
            Send
          </button>
        </form>
      </div>
    )
  }

  // Conversation list view
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Messages</h1>

      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>&#128172;</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>No messages yet</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            Your school will reach out to you here
          </div>
        </div>
      ) : (
        conversations.map(conv => (
          <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
            display: 'flex', gap: 12, padding: '14px 16px', background: '#fff',
            borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 8,
            cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s'
          }}>
            {/* Avatar */}
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#1d4ed8', fontSize: 16, flexShrink: 0
            }}>
              {getConvName(conv).charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: 14, color: '#0f172a' }}>
                  {getConvName(conv)}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
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
