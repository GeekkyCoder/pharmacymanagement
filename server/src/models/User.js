const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], required: true },
  // For employees, reference owning admin. For admins, this is null.
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure employees have an admin owner before save (soft validation to avoid breaking migration; throws if missing).
UserSchema.pre('save', function(next) {
  if (this.role === 'employee' && !this.admin) {
    return next(new Error('Employee must have an admin assigned'));
  }
  next();
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
