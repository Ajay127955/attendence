'use strict';

const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { User, Student } = require('../models');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  randomToken,
  refreshTokenTtlMs,
} = require('../utils/tokens');
const { sendMail, resetPasswordEmail } = require('../utils/mailer');
const env = require('../config/env');

function buildPayload(user) {
  return { sub: String(user._id), role: user.role, name: user.name };
}

/** Issues an access + refresh token pair and persists the refresh hash. */
async function issueTokens(user, userAgent = '') {
  const accessToken = signAccessToken(buildPayload(user));
  const refreshToken = signRefreshToken({ sub: String(user._id), type: 'refresh' });

  user.refreshTokens = user.refreshTokens || [];
  user.pruneRefreshTokens();
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
    userAgent: String(userAgent).slice(0, 200),
  });
  // Keep at most 5 active sessions per account.
  if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
  await user.save();

  return { accessToken, refreshToken };
}

async function login({ identifier, password, userAgent }) {
  const query = {
    $or: [
      { email: String(identifier).toLowerCase() },
      { rollNo: String(identifier).toUpperCase() },
    ],
  };
  const user = await User.findOne(query).select('+passwordHash +refreshTokens');
  // Constant-ish response: same error for unknown user and wrong password.
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  const valid = await user.verifyPassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

  user.lastLoginAt = new Date();
  const tokens = await issueTokens(user, userAgent);

  const safe = await User.findById(user._id);
  return { user: safe, ...tokens };
}

/** Rotates the refresh token; rejects reuse of an unknown/expired token. */
async function refresh(refreshToken, userAgent) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account unavailable');

  const hash = hashToken(refreshToken);
  const match = (user.refreshTokens || []).find((t) => t.tokenHash === hash);
  if (!match) throw ApiError.unauthorized('Refresh token has been revoked');

  // Rotate: drop the used token, issue a new pair.
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hash);
  const tokens = await issueTokens(user, userAgent);
  return { user, ...tokens };
}

async function logout(user, refreshToken) {
  if (!user) return;
  const doc = await User.findById(user._id).select('+refreshTokens');
  if (!doc) return;
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    doc.refreshTokens = (doc.refreshTokens || []).filter((t) => t.tokenHash !== hash);
  } else {
    doc.refreshTokens = [];
  }
  await doc.save();
}

async function changePassword(user, currentPassword, newPassword) {
  const doc = await User.findById(user._id).select('+passwordHash +refreshTokens');
  const ok = await doc.verifyPassword(currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');
  await doc.setPassword(newPassword);
  doc.refreshTokens = []; // force re-login everywhere
  await doc.save();
  return doc;
}

/** Always resolves — never reveals whether an account exists. */
async function forgotPassword(email) {
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return { sent: true };

  const raw = randomToken(32);
  user.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const link = `${env.CLIENT_URL}/reset-password?token=${raw}&email=${encodeURIComponent(user.email)}`;
  const { subject, text, html } = resetPasswordEmail({ name: user.name, link });
  await sendMail({ to: user.email, subject, html, text });
  return { sent: true };
}

async function resetPassword({ token, email, password }) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: String(email).toLowerCase(),
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +passwordHash +refreshTokens');

  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  await user.setPassword(password);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshTokens = [];
  await user.save();
  return user;
}

/** Registers a new account (admin-only in this product). */
async function register({ name, email, rollNo, password, role, phone }) {
  const existing = await User.findOne({
    $or: [
      email ? { email: String(email).toLowerCase() } : null,
      rollNo ? { rollNo: String(rollNo).toUpperCase() } : null,
    ].filter(Boolean),
  });
  if (existing) throw ApiError.conflict('An account with that email or roll number already exists');

  const user = new User({ name, email, rollNo, role, phone, isActive: true });
  await user.setPassword(password);
  await user.save();
  return user;
}

/** Returns the profile plus linked student record when applicable. */
async function me(user) {
  const safe = await User.findById(user._id);
  let student = null;
  if (user.role === 'student') {
    student = await Student.findOne({ user: user._id }).populate('class', 'name section academicYear');
  }
  return { user: safe, student };
}

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  register,
  issueTokens,
  me,
};
