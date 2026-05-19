require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function seed() {
  console.log('Connecting to MongoDB...')
  console.log('URI:', process.env.MONGODB_URI ? 'Found ✅' : 'NOT FOUND ❌')
  
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected! ✅')

  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
  }, { timestamps: true })

  const User = mongoose.models.User || mongoose.model('User', userSchema)

  const exists = await User.findOne({ email: 'admin@zyntra.com' })
  if (exists) {
    console.log('Admin already exists! ✅')
    await mongoose.disconnect()
    return
  }

  const hashed = await bcrypt.hash('admin123456', 12)
  await User.create({
    name: 'ZYNTRA Admin',
    email: 'admin@zyntra.com',
    password: hashed,
    role: 'admin'
  })

  console.log('✅ Admin created!')
  console.log('Email: admin@zyntra.com')
  console.log('Password: admin123456')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})