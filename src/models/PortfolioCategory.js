const mongoose = require('mongoose')

const DEFAULT_CATEGORIES = [
  { nameEn: 'Web Development',  nameAr: 'تطوير المواقع',               slug: 'web-development',  color: '#3B82F6', icon: '◉', order: 1, isBuiltIn: true },
  { nameEn: 'Branding',         nameAr: 'العلامة التجارية',            slug: 'branding',         color: '#F59E0B', icon: '◈', order: 2, isBuiltIn: true },
  { nameEn: 'UI/UX Design',     nameAr: 'تصميم واجهات المستخدم',      slug: 'ui-ux-design',     color: '#8B5CF6', icon: '◫', order: 3, isBuiltIn: true },
  { nameEn: 'Mobile Apps',      nameAr: 'تطبيقات الجوال',              slug: 'mobile-apps',      color: '#10B981', icon: '◎', order: 4, isBuiltIn: true },
  { nameEn: 'E-commerce',       nameAr: 'التجارة الإلكترونية',         slug: 'e-commerce',       color: '#EF4444', icon: '◐', order: 5, isBuiltIn: true },
  { nameEn: 'SEO Services',     nameAr: 'خدمات تحسين محركات البحث',   slug: 'seo-services',     color: '#06B6D4', icon: '◑', order: 6, isBuiltIn: true },
]

const PortfolioCategorySchema = new mongoose.Schema({
  nameEn:    { type: String, required: true },
  nameAr:    { type: String, default: '' },
  slug:      { type: String, required: true, unique: true },
  color:     { type: String, default: '#3B82F6' },
  icon:      { type: String, default: '◉' },
  order:     { type: Number, default: 0 },
  status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
  isBuiltIn: { type: Boolean, default: false },
}, { timestamps: true })

const PortfolioCategory = mongoose.model('PortfolioCategory', PortfolioCategorySchema)
module.exports = PortfolioCategory
module.exports.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES
