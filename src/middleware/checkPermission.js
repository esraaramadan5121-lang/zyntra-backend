const Role = require('../models/Role')

// Roles that always have full access regardless of DB state
const FULL_ACCESS_ROLES = ['superadmin', 'admin']

const checkPermission = (permission) => async (req, res, next) => {
  try {
    const userRole = req.user.role
    if (FULL_ACCESS_ROLES.includes(userRole)) return next()

    // Try DB role permissions first
    try {
      const roleDoc = await Role.findOne({ name: userRole }).lean()
      if (roleDoc) {
        if (roleDoc.permissions.includes(permission)) return next()
        return res.status(403).json({ success: false, message: `Permission denied: requires '${permission}'` })
      }
    } catch {}

    // Unknown role → deny
    return res.status(403).json({ success: false, message: 'Permission denied' })
  } catch (err) {
    next(err)
  }
}

module.exports = checkPermission
