'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const authService = require('../services/auth.service');
const { recordAudit } = require('../middleware/audit');
const {
  setRefreshCookie,
  clearRefreshCookie,
  setAccessCookie,
  clearAccessCookie,
} = require('../utils/cookies');

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({
    identifier,
    password,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, refreshToken);
  setAccessCookie(res, accessToken);

  await recordAudit({
    req: { ...req, user },
    action: 'auth.login',
    entity: 'User',
    entityId: user._id,
    description: `${user.name} signed in`,
  });

  return ok(res, { user, accessToken }, 'Signed in successfully');
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refresh(token, req.headers['user-agent']);
  setRefreshCookie(res, refreshToken);
  setAccessCookie(res, accessToken);
  return ok(res, { user, accessToken }, 'Session refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user, req.cookies?.refreshToken);
  clearRefreshCookie(res);
  clearAccessCookie(res);
  return ok(res, null, 'Signed out');
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.user);
  return ok(res, data, 'Current user');
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await require('../models').User.findById(req.user._id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  await user.save();
  return ok(res, { user }, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user, req.body.currentPassword, req.body.newPassword);
  clearRefreshCookie(res);
  clearAccessCookie(res);
  await recordAudit({ req, action: 'auth.changePassword', entity: 'User', entityId: req.user._id });
  return ok(res, null, 'Password changed. Please sign in again.');
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ok(res, null, 'If an account exists for that email, a reset link has been sent.');
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  await recordAudit({ req, action: 'auth.resetPassword', entity: 'User' });
  return ok(res, null, 'Password reset successful. You can now sign in.');
});

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  await recordAudit({ req, action: 'auth.register', entity: 'User', entityId: user._id, after: { role: user.role } });
  return created(res, { user }, 'Account created');
});

module.exports = {
  login,
  refresh,
  logout,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  register,
};
