const express  = require('express')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// POST /upload/logo
// Accepts base64 image and stores directly in schools.logo_url
// No Supabase Storage bucket required
router.post('/logo', async (req, res) => {
  const { base64, mime_type } = req.body
  if (!base64 || !mime_type) {
    return res.status(400).json({ error: 'base64 and mime_type required' })
  }

  // Validate size — reject anything over 3MB base64 (~2.25MB image)
  if (base64.length > 3 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image too large. Please use an image under 2MB.' })
  }

  try {
    const logo_url = `data:${mime_type};base64,${base64}`

    const { data, error } = await supabase
      .from('schools')
      .update({ logo_url })
      .eq('id', req.user.school_id)
      .select('logo_url')
      .single()

    if (error) throw error
    res.json({ logo_url: data.logo_url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
