const jwt = require('jsonwebtoken')

/**
 * Middleware that verifies a platform super-admin JWT.
 * The JWT must contain { platform_admin: true, email }.
 */
module.exports = function superAdminMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!decoded.platform_admin) {
      return res.status(403).json({ error: 'Not a platform admin' })
    }
    req.admin = decoded   // { id, email, platform_admin: true }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
