'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { User, Student } = require('../models');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { recordAudit } = require('../middleware/audit');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query, {
    allowedSort: ['name', 'email', 'role', 'createdAt', 'isActive'],
  });
  const query = {};
  if (req.query.role) query.role = req.query.role;
  if (req.query.isActive) query.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ name: rx }, { email: rx }, { rollNo: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(query).sort(sort).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return ok(res, items, 'Users', buildMeta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user, 'User');
});

const create = asyncHandler(async (req, res) => {
  const { name, email, rollNo, password, role, phone, isActive } = req.body;
  if (!email && !rollNo) throw ApiError.badRequest('Either email or roll number is required');

  const user = new User({ name, email, rollNo, role, phone, isActive: isActive !== false });
  await user.setPassword(password);
  await user.save();

  await recordAudit({ req, action: 'user.create', entity: 'User', entityId: user._id, after: { name, role } });
  return created(res, user, 'User created');
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const before = { name: user.name, role: user.role, isActive: user.isActive };
  const { password, ...rest } = req.body;
  Object.assign(user, rest);
  if (password) await user.setPassword(password);
  await user.save();

  await recordAudit({ req, action: 'user.update', entity: 'User', entityId: user._id, before, after: rest });
  return ok(res, user, 'User updated');
});

const remove = asyncHandler(async (req, res) => {
  if (String(req.user._id) === String(req.params.id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Soft-delete: deactivate rather than destroy history/audit references.
  user.isActive = false;
  user.refreshTokens = [];
  await user.save();
  if (user.role === 'student') {
    await Student.updateOne({ user: user._id }, { $set: { isActive: false } });
  }

  await recordAudit({ req, action: 'user.deactivate', entity: 'User', entityId: user._id });
  return ok(res, null, 'User deactivated');
});

const teachers = asyncHandler(async (_req, res) => {
  const items = await User.find({ role: 'teacher', isActive: true }).select('name email phone').sort('name');
  return ok(res, items, 'Teachers');
});

module.exports = { list, getOne, create, update, remove, teachers };
