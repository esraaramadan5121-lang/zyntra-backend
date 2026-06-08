const mongoose = require('mongoose')

const ALL_PERMISSIONS = [
  'create_articles', 'edit_own_articles', 'edit_all_articles', 'delete_articles',
  'publish_articles', 'approve_articles', 'schedule_articles',
  'view_users', 'create_users', 'edit_users', 'delete_users', 'manage_roles',
  'upload_files', 'delete_files', 'view_media',
  'manage_categories', 'manage_tags',
  'view_settings', 'edit_settings',
  'view_audit_logs',
]

const BUILT_IN_ROLES = [
  {
    name: 'superadmin',
    nameEn: 'Super Admin',
    nameAr: 'مدير النظام',
    description: 'Full access to all features and settings',
    descriptionAr: 'وصول كامل لجميع الميزات والإعدادات',
    permissions: [...ALL_PERMISSIONS],
    isBuiltIn: true,
    color: '#C9A24A',
  },
  {
    name: 'admin',
    nameEn: 'Admin',
    nameAr: 'مدير',
    description: 'Full access — legacy admin role',
    descriptionAr: 'وصول كامل — دور المدير القديم',
    permissions: [...ALL_PERMISSIONS],
    isBuiltIn: true,
    color: '#C9A24A',
  },
  {
    name: 'editor',
    nameEn: 'Editor',
    nameAr: 'محرر',
    description: 'Can approve, reject, and publish articles',
    descriptionAr: 'يمكنه اعتماد ورفض ونشر المقالات',
    permissions: [
      'create_articles', 'edit_own_articles', 'edit_all_articles', 'delete_articles',
      'approve_articles', 'view_users', 'view_media', 'upload_files',
      'manage_categories', 'manage_tags', 'view_settings', 'view_audit_logs',
    ],
    isBuiltIn: true,
    color: '#3B82F6',
  },
  {
    name: 'author',
    nameEn: 'Author',
    nameAr: 'كاتب',
    description: 'Can create and edit their own articles only',
    descriptionAr: 'يمكنه إنشاء وتعديل مقالاته الخاصة فقط',
    permissions: ['create_articles', 'edit_own_articles', 'view_media', 'upload_files', 'manage_categories', 'manage_tags'],
    isBuiltIn: true,
    color: '#22C55E',
  },
  {
    name: 'seo_manager',
    nameEn: 'SEO Manager',
    nameAr: 'مدير تحسين محركات البحث',
    description: 'Can edit SEO fields and manage categories/tags',
    descriptionAr: 'يمكنه تعديل حقول تحسين محركات البحث وإدارة الفئات والوسوم',
    permissions: ['edit_all_articles', 'view_media', 'manage_categories', 'manage_tags', 'view_settings', 'edit_settings'],
    isBuiltIn: true,
    color: '#8B5CF6',
  },
  {
    name: 'viewer',
    nameEn: 'Viewer',
    nameAr: 'مشاهد',
    description: 'Read-only access to the dashboard',
    descriptionAr: 'وصول للقراءة فقط للوحة التحكم',
    permissions: ['view_users', 'view_media', 'view_settings', 'view_audit_logs'],
    isBuiltIn: true,
    color: 'rgba(255,255,255,0.45)',
  },
]

const RoleSchema = new mongoose.Schema({
  name:          { type: String, required: true, unique: true },
  nameEn:        { type: String, required: true },
  nameAr:        { type: String, required: true },
  description:   { type: String, default: '' },
  descriptionAr: { type: String, default: '' },
  permissions:   [{ type: String }],
  isBuiltIn:     { type: Boolean, default: false },
  color:         { type: String, default: '#C9A24A' },
}, { timestamps: true })

const Role = mongoose.model('Role', RoleSchema)

module.exports = Role
module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS
module.exports.BUILT_IN_ROLES = BUILT_IN_ROLES
