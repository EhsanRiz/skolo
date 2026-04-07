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
  const [search, setSearch] = useState('')
  const [parentSearch, setParentSearch] = useState('')
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
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 15000)
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
    } catch { /* silently fail */ }
    setLoading(false)
  }

  async function loadMessages(convId) {
    try {
      const { data } = await api.get(`/messaging/conversations/${convId}/messages`)
      setMessages(data.messages || [])
    } catch { /* silently fail */ }
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
    setParentSearch('')
    setLoadingParents(true)
    try {
      const { data } = await api.get('/messaging/parents')
      setParents(data.parents || [])
    } catch { /* silently fail */ }
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

  function getConvLearnerInfo(conv) {
    const other = conv.participants?.find(p => p.user_id !== user.id)
    if (!other?.learners?.length) return null
    return other.learners.map(l =>
      `${l.first_name} ${l.last_name}${l.classes?.grades?.name ? ` \u00b7 ${l.classes.grades.name} ${l.classes.name || ''}` : ''}`
    ).join(', ')
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

  function getDateLabel(ts) {
    const d = new Date(ts)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = today - msgDay
    if (diff === 0) return 'Today'
    if (diff <= 86400000) return 'Yesterday'
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Group messages by date
  function groupMessagesByDate(msgs) {
    const groups = []
    let currentLabel = null
    for (const msg of msgs) {
      const label = getDateLabel(msg.created_at)
      if (label !== currentLabel) {
        groups.push({ type: 'date', label })
        currentLabel = label
      }
      groups.push({ type: 'msg', data: msg })
    }
    return groups
  }

  // Filter conversations by search
  const filteredConvs = search.trim()
    ? conversations.filter(c => {
        const name = getConvName(c).toLowerCase()
        const learner = (getConvLearnerInfo(c) || '').toLowerCase()
        const q = search.toLowerCase()
        return name.includes(q) || learner.includes(q)
      })
    : conversations

  // Filter parents by search
  const filteredParents = parentSearch.trim()
    ? parents.filter(p => {
        const q = parentSearch.toLowerCase()
        return p.full_name.toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.learners || []).some(l => `${l.first_name} ${l.last_name}`.toLowerCase().includes(q))
      })
    : parents

  const grouped = groupMessagesByDate(messages)

  // ── New message: parent selection ──
  if (showNew) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setShowNew(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#1d4ed8', padding: 4
          }}>&larr;</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>New message</h1>
        </div>

        {/* Parent search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={parentSearch} onChange={e => setParentSearch(e.target.value)}
            placeholder="Search parents by name, email, or learner..."
            style={{
              width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
              background: '#fff'
            }}
          />
        </div>

        {loadingParents ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading parents...</div>
        ) : filteredParents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
            {parentSearch ? 'No parents match your search' : 'No parents have registered yet. Invite parents from Settings \u2192 Parent Invitations.'}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            {filteredParents.map((p, i) => (
              <div key={p.id} onClick={() => startConversation(p)} style={{
                display: 'flex', gap: 12, padding: '14px 20px', cursor: 'pointer', alignItems: 'center',
                borderBottom: i < filteredParents.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{p.full_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.email}
                    {p.learners?.length > 0 && (
                      <span style={{ marginLeft: 8, color: '#94a3b8' }}>
                        &middot; {p.learners.map(l => `${l.first_name} ${l.last_name}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 18, flexShrink: 0 }}>&rsaquo;</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 400 }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 12, borderRadius: '14px 14px 0 0',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)', flexShrink: 0
        }}>
          <button onClick={() => { setActiveConv(null); loadConversations() }} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#1d4ed8', padding: 4
          }}>&larr;</button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#1d4ed8', fontSize: 14, flexShrink: 0
          }}>
            {getConvName(activeConv).charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{getConvName(activeConv)}</div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getConvRole(activeConv)}
              {getConvLearnerInfo(activeConv) && (
                <span style={{ color: '#1d4ed8', marginLeft: 6 }}>&middot; {getConvLearnerInfo(activeConv)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Messages with date grouping */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', background: '#f8fafc' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
              Send a message to start the conversation
            </div>
          )}
          {grouped.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 12px',
                }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                    letterSpacing: '0.5px', whiteSpace: 'nowrap', padding: '0 4px'
                  }}>
                    {item.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
              )
            }
            const msg = item.data
            const isMine = msg.sender_id === user.id
            if (msg.is_system) return (
              <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: '8px 0' }}>
                {msg.body}
              </div>
            )
            return (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6
              }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 14,
                  background: isMine ? '#0f2044' : '#fff',
                  color: isMine ? '#fff' : '#0f172a',
                  border: isMine ? 'none' : '1px solid #e2e8f0',
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius: isMine ? 14 : 4,
                  boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,.04)'
                }}>
                  {!isMine && msg.users?.full_name && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', marginBottom: 2 }}>
                      {msg.users.full_name}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</div>
                  <div style={{
                    fontSize: 10, marginTop: 4, textAlign: 'right',
                    color: isMine ? 'rgba(255,255,255,0.45)' : '#94a3b8'
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{
          padding: '12px 16px', background: '#fff', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 8, borderRadius: '0 0 14px 14px', flexShrink: 0
        }}>
          <input
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..." autoFocus
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0',
              fontSize: 14, outline: 'none', fontFamily: 'inherit'
            }}
          />
          <button type="submit" disabled={sending || !newMsg.trim()} style={{
            padding: '10px 20px', borderRadius: 24, border: 'none',
            background: '#0f2044', color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: sending || !newMsg.trim() ? 'default' : 'pointer',
            opacity: sending || !newMsg.trim() ? 0.4 : 1, transition: 'opacity .15s',
            fontFamily: 'inherit'
          }}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    )
  }

  // ── Conversation list ──
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
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

      {/* Search */}
      {conversations.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            style={{
              width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
              background: '#fff'
            }}
          />
        </div>
      )}

      {conversations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ color: '#64748b', fontSize: 15, fontWeight: 600 }}>No conversations yet</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
            Click <strong>&ldquo;+ New message&rdquo;</strong> to start a conversation with a parent
          </div>
        </div>
      ) : filteredConvs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
          No conversations match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
          {filteredConvs.map((conv, i) => (
            <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
              display: 'flex', gap: 14, padding: '14px 18px', cursor: 'pointer', alignItems: 'center',
              borderBottom: i < filteredConvs.length - 1 ? '1px solid #f1f5f9' : 'none',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: conv.unread_count > 0 ? '#0f2044' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: conv.unread_count > 0 ? '#fff' : '#1d4ed8', fontSize: 16, flexShrink: 0,
                transition: 'all .15s'
              }}>
                {getConvName(conv).charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getConvName(conv)}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 8, textTransform: 'capitalize' }}>
                      {getConvRole(conv)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                    {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                  </div>
                </div>
                {getConvLearnerInfo(conv) && (
                  <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getConvLearnerInfo(conv)}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <div style={{
                    fontSize: 13, color: conv.unread_count > 0 ? '#374151' : '#94a3b8', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                    fontWeight: conv.unread_count > 0 ? 500 : 400
                  }}>
                    {conv.last_message?.body || 'No messages yet'}
                  </div>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: '#0f2044', color: '#fff', fontSize: 10, fontWeight: 700,
                      borderRadius: 10, padding: '2px 8px', marginLeft: 8, flexShrink: 0, minWidth: 20, textAlign: 'center'
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
