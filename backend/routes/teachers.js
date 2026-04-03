const express = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, classes(name, grades(name))')
      .eq('school_id', req.user.school_id)
      .order('full_name')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const reference_no = await nextRefNo(req.user.school_id, 'teacher')
    // Strip empty class_id so we don't pass '' as a UUID
    const body = { ...req.body, school_id: req.user.school_id, reference_no }
    if (!body.class_id) delete body.class_id
    const { data, error } = await supabase
      .from('teachers')
      .insert(body)
      .select('*, classes(name, grades(name))')
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
      .select('*, classes(name, grades(name))')
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('school_id', req.user.school_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
