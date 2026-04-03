const express = require('express')
const supabase = require('../lib/supabase')
const auth    = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// POST /upload/logo — accepts base64 image, stores in Supabase Storage
router.post('/logo', async (req, res) => {
  const { base64, mime_type, file_name } = req.body
  if (!base64 || !mime_type) return res.status(400).json({ error: 'base64 and mime_type required' })

  try {
    const buffer = Buffer.from(base64, 'base64')
    const path   = `${req.user.school_id}/${file_name || 'logo.png'}`

    const { error: upErr } = await supabase.storage
      .from('school-logos')
      .upload(path, buffer, { contentType: mime_type, upsert: true })

    if (upErr) throw upErr

    const { data: { publicUrl } } = supabase.storage
      .from('school-logos')
      .getPublicUrl(path)

    // Save to school record
    await supabase.from('schools').update({ logo_url: publicUrl }).eq('id', req.user.school_id)

    res.json({ logo_url: publicUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
