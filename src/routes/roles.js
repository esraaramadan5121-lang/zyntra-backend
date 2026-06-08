const router = require('express').Router()
const Role = require('../models/Role')
const User = require('../models/User')
const { protect, logAction } = require('../middleware/auth')
const { BUILT_IN_ROLES, ALL_PERMISSIONS } = require('../models/Role')

const SAFE_FIELDS = '-password -refreshToken -loginAttempts -lockUntil'

const requireAdmin = (req, res, next) => {
  if (!['superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}

// Upsert built-in roles so they always exist in the DB
const seedBuiltInRoles = async () => {
  try {
    await Promise.all(
      BUILT_IN_ROLES.map(r =>
        Role.findOneAndUpdate(
          { name: r.name },
          { $setOnInsert: r },
          { upsert: true, new: false }
        )
      )
    )
  } catch {}
}

// GET /api/roles
router.get('/', protect, async (req, res) => {
  await seedBuiltInRoles()
  try {
    const roles = await Role.find().sort({ isBuiltIn: -1, createdAt: 1 })
    const userCounts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
    const countMap = Object.fromEntries(userCounts.map(u => [u._id, u.count]))
    const result = roles.map(r => ({ ...r.toObject(), userCount: countMap[r.name] || 0 }))
    res.json({ success: true, data: result })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/roles  (admin only)
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const { nameEn, nameAr, description, descriptionAr, permissions, color } = req.body
    if (!nameEn?.trim()) return res.status(422).json({ success: false, message: 'nameEn is required' })
    const name = nameEn.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const exists = await Role.findOne({ name })
    if (exists) return res.status(400).json({ success: false, message: 'Role name already exists' })
    const safePerms = (permissions || []).filter(p => ALL_PERMISSIONS.includes(p))
    const role = await Role.create({
      name,
      nameEn: nameEn.trim(),
      nameAr: (nameAr || nameEn).trim(),
      description: description || '',
      descriptionAr: descriptionAr || '',
      permissions: safePerms,
      isBuiltIn: false,
      color: color || '#C9A24A',
    })
    await logAction(req.user.id, 'CREATE', 'Role', role._id.toString(), role.nameEn)
    res.status(201).json({ success: true, data: role })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/roles/:id  (admin only)
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { permissions, nameEn, nameAr, description, descriptionAr, color } = req.body
    const role = await Role.findById(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' })
    if (permissions !== undefined) {
      role.permissions = permissions.filter(p => ALL_PERMISSIONS.includes(p))
    }
    if (!role.isBuiltIn) {
      if (nameEn !== undefined) role.nameEn = nameEn
      if (nameAr !== undefined) role.nameAr = nameAr
    }
    if (description !== undefined) role.description = description
    if (descriptionAr !== undefined) role.descriptionAr = descriptionAr
    if (color !== undefined) role.color = color
    await role.save()
    await logAction(req.user.id, 'UPDATE', 'Role', role._id.toString(), role.nameEn)
    res.json({ success: true, data: role })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/roles/:id  (admin only — custom roles only)
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' })
    if (role.isBuiltIn) return res.status(400).json({ success: false, message: 'Cannot delete built-in roles' })
    await role.deleteOne()
    await logAction(req.user.id, 'DELETE', 'Role', req.params.id, role.nameEn)
    res.json({ success: true, message: 'Role deleted' })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/roles/:id/users
router.get('/:id/users', protect, requireAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' })
    const users = await User.find({ role: role.name }).select(SAFE_FIELDS).sort({ createdAt: -1 })
    res.json({ success: true, data: users, roleName: role.nameEn })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
