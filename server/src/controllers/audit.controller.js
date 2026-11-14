'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { AuditLog } = require('../models');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { toDateOnly } = require('../utils/dates');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query, { allowedSort: ['createdAt', 'action'] });
  const query = {};
  if (req.query.action) query.action = new RegExp(escapeRegex(req.query.action), 'i');
  if (req.query.entity) query.entity = req.query.entity;
  if (req.query.actor) query.actor = req.query.actor;
  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) query.createdAt.$gte = toDateOnly(req.query.from);
    if (req.query.to) {
      const end = toDateOnly(req.query.to);
      end.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    AuditLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);
  return ok(res, items, 'Audit logs', buildMeta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).lean();
  if (!log) throw ApiError.notFound('Audit log not found');
  return ok(res, log, 'Audit log');
});

module.exports = { list, getOne };
