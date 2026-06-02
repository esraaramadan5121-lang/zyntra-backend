const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 30 * 60 * 1000 // 30 minutes in ms

const UserSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true, minlength: 12 },
  role:          { type: String, default: 'admin' },
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date },
  lastLogin:     { type: Date },
  refreshToken:  { type: String },
}, { timestamps: true })

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password)
}

UserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now())
}

UserSchema.methods.incrementLoginAttempts = async function() {
  // If previous lock expired, restart count
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } })
  }
  const updates = { $inc: { loginAttempts: 1 } }
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME }
  }
  return this.updateOne(updates)
}

UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  })
}

module.exports = mongoose.model('User', UserSchema)
