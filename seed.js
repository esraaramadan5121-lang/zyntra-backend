require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed script cannot run in production')
  process.exit(1)
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/

async function seed() {
  const email = process.env.ADMIN_EMAIL_LOGIN
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL_LOGIN and ADMIN_PASSWORD must be set in .env')
    process.exit(1)
  }

  if (!PASSWORD_REGEX.test(password)) {
    console.error('❌ ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and special character')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...')
  console.log('URI:', process.env.MONGODB_URI ? 'Found ✅' : 'NOT FOUND ❌')

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected! ✅')

  const userSchema = new mongoose.Schema({
    name:          String,
    email:         { type: String, unique: true },
    password:      String,
    role:          String,
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date },
    lastLogin:     { type: Date },
    refreshToken:  { type: String },
  }, { timestamps: true })

  const User = mongoose.models.User || mongoose.model('User', userSchema)

  const exists = await User.findOne({ email })
  if (exists) {
    console.log('Admin already exists! ✅')
    await mongoose.disconnect()
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  await User.create({ name: 'ZYNTRA Admin', email, password: hashed, role: 'admin' })

  console.log('✅ Admin created!')
  console.log(`Email: ${email}`)
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
