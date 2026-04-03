const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// GET /notifications — for current user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .eq('is_read', false)
    if (error) throw error
    res.json({ count: count || 0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /notifications/mark-all-read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('school_id', req.user.school_id)
      .eq('is_read', false)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
