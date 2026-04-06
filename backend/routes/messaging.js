const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const supabase = require('../lib/supabase')

router.use(auth)

// GET /messaging/conversations — list user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id
    const schoolId = req.user.school_id

    // Get conversations the user participates in
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, is_muted')
      .eq('user_id', userId)

    if (!participations || participations.length === 0) {
      return res.json({ conversations: [] })
    }

    const convIds = participations.map(p => p.conversation_id)
    const readMap = {}
    participations.forEach(p => { readMap[p.conversation_id] = p.last_read_at })

    // Get conversation details
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, type, title, is_active, created_at, updated_at, created_by')
      .in('id', convIds)
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    // For each conversation, get last message + unread count + participants
    for (const conv of (conversations || [])) {
      // Last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('id, body, sender_id, created_at, users(full_name)')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      conv.last_message = lastMsg

      // Unread count
      const lastRead = readMap[conv.id] || '1970-01-01'
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .gt('created_at', lastRead)
        .neq('sender_id', userId)

      conv.unread_count = count || 0

      // Participants (names)
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, role, users(full_name, role)')
        .eq('conversation_id', conv.id)

      conv.participants = (parts || []).map(p => ({
        user_id: p.user_id,
        name: p.users?.full_name,
        role: p.users?.role,
        conv_role: p.role
      }))
    }

    res.json({ conversations: conversations || [] })
  } catch (err) {
    console.error('List conversations error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /messaging/conversations — create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { type, title, participant_ids } = req.body
    const schoolId = req.user.school_id
    const userId = req.user.id

    if (!type) return res.status(400).json({ error: 'Conversation type required' })

    // Only staff can create conversations (for now)
    if (req.user.role === 'parent' && type !== 'direct') {
      return res.status(403).json({ error: 'Parents can only reply to existing conversations' })
    }

    // For direct messages, check if conversation already exists between these users
    if (type === 'direct' && participant_ids?.length === 1) {
      const otherUserId = participant_ids[0]

      // Find existing direct conversation between these two users
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)

      if (existingParticipations?.length > 0) {
        const myConvIds = existingParticipations.map(p => p.conversation_id)

        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myConvIds)

        if (otherParticipations?.length > 0) {
          // Check if any of these are direct conversations
          const sharedConvIds = otherParticipations.map(p => p.conversation_id)
          const { data: directConv } = await supabase
            .from('conversations')
            .select('id')
            .in('id', sharedConvIds)
            .eq('type', 'direct')
            .eq('school_id', schoolId)
            .eq('is_active', true)
            .maybeSingle()

          if (directConv) {
            return res.json({ conversation: directConv, existing: true })
          }
        }
      }
    }

    // Create conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        school_id: schoolId,
        type,
        title: title || null,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    // Add creator as participant (admin role)
    const participants = [
      { conversation_id: conv.id, user_id: userId, role: 'admin' }
    ]

    // Add other participants
    if (participant_ids?.length > 0) {
      for (const pid of participant_ids) {
        participants.push({ conversation_id: conv.id, user_id: pid, role: 'member' })
      }
    }

    await supabase.from('conversation_participants').insert(participants)

    // Add system message
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: userId,
      body: 'Conversation started',
      is_system: true
    })

    res.status(201).json({ conversation: conv })
  } catch (err) {
    console.error('Create conversation error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /messaging/conversations/:id/messages — get messages (paginated)
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const convId = req.params.id
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 50
    const before = req.query.before // cursor: created_at timestamp

    // Verify user is participant
    const { data: part } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', convId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!part) return res.status(403).json({ error: 'Not a participant of this conversation' })

    let query = supabase
      .from('messages')
      .select('id, body, sender_id, media_url, media_type, is_system, created_at, users(full_name, role)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query
    if (error) throw error

    // Return in chronological order
    res.json({ messages: (messages || []).reverse() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /messaging/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const convId = req.params.id
    const userId = req.user.id
    const { body } = req.body

    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body required' })

    // Verify user is participant
    const { data: part } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', convId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!part) return res.status(403).json({ error: 'Not a participant of this conversation' })

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: userId,
        body: body.trim()
      })
      .select('id, body, sender_id, is_system, created_at, users(full_name, role)')
      .single()

    if (error) throw error

    // Update sender's last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', userId)

    res.status(201).json({ message })
  } catch (err) {
    console.error('Send message error:', err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /messaging/conversations/:id/read — mark conversation as read
router.patch('/conversations/:id/read', async (req, res) => {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.id)
      .eq('user_id', req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /messaging/unread-count — total unread across all conversations
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)

    let total = 0
    for (const p of (participations || [])) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id)
        .gt('created_at', p.last_read_at || '1970-01-01')
        .neq('sender_id', userId)

      total += (count || 0)
    }

    res.json({ count: total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /messaging/parents — list parents for new conversation (staff only)
router.get('/parents', async (req, res) => {
  try {
    if (req.user.role === 'parent') return res.status(403).json({ error: 'Staff only' })

    const { data: parents } = await supabase
      .from('users')
      .select('id, full_name, email, guardian_id')
      .eq('school_id', req.user.school_id)
      .eq('role', 'parent')
      .eq('is_active', true)
      .order('full_name')

    // Get guardian -> learner links for context
    for (const parent of (parents || [])) {
      if (parent.guardian_id) {
        const { data: links } = await supabase
          .from('learner_guardians')
          .select('learners(first_name, last_name, classes(name, grades(name)))')
          .eq('guardian_id', parent.guardian_id)

        parent.learners = (links || []).map(l => l.learners).filter(Boolean)
      }
    }

    res.json({ parents: parents || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
