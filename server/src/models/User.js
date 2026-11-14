'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'teacher', 'student'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: { unique: true, sparse: true },
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // Students log in with their roll number as well as an email.
    rollNo: { type: String, trim: true, uppercase: true, index: { unique: true, sparse: true } },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },

    // Password reset (store only a hash of the emailed token)
    resetPasswordToken: { type: String, select: false, default: null },
    resetPasswordExpires: { type: Date, select: false, default: null },

    // Hashed refresh tokens — supports several active devices and rotation.
    refreshTokens: {
      type: [
        {
          tokenHash: { type: String, required: true },
          expiresAt: { type: Date, required: true },
          userAgent: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      select: false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.virtual('initials').get(function () {
  return (this.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
});

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function (plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

/** Keeps the refresh-token list small and drops expired entries. */
userSchema.methods.pruneRefreshTokens = function () {
  const now = Date.now();
  this.refreshTokens = (this.refreshTokens || []).filter((t) => t.expiresAt.getTime() > now);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
