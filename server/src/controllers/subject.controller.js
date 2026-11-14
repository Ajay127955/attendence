'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { Subject, Attendance } = require('../models');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { recordAudit } = require('../middleware/audit');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query, {
    allowedSort: ['name', 'code', 'createdAt'],
  });
  const query = {};
  if (req.query.classId) query.class = req.query.classId;
  if (req.query.teacherId) query.teacher = req.query.teacherId;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ name: rx }, { code: rx }];
  }
  if (req.user.role === 'teacher') {
    const { teacherClassIds } = require('../services/access.service');
    query.class = req.query.classId ? req.query.classId : { $in: await teacherClassIds(req.user._id) };
  }

  const [items, total] = await Promise.all([
    Subject.find(query).populate('class', 'name section').populate('teacher', 'name email').sort(sort).skip(skip).limit(limit).lean(),
    Subject.countDocuments(query),
  ]);

  return ok(res, items, 'Subjects', buildMeta({ page, limit, total }));
});

const options = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.classId) query.class = req.query.classId;
  if (req.user.role === 'teacher') query.teacher = req.user._id;
  const items = await Subject.find(query).select('name code class').sort('name').lean();
  return ok(res, items, 'Subject options');
});

const getOne = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id).populate('class', 'name section').populate('teacher', 'name email').lean();
  if (!subject) throw ApiError.notFound('Subject not found');
  return ok(res, subject, 'Subject');
});

const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (!payload.teacher) delete payload.teacher;
  const subject = await Subject.create(payload);
  await recordAudit({ req, action: 'subject.create', entity: 'Subject', entityId: subject._id, after: req.body });
  return created(res, subject, 'Subject created');
});

const update = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!subject) throw ApiError.notFound('Subject not found');
  await recordAudit({ req, action: 'subject.update', entity: 'Subject', entityId: subject._id, after: req.body });
  return ok(res, subject, 'Subject updated');
});

const remove = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');
  const count = await Attendance.countDocuments({ subject: subject._id });
  if (count > 0) {
    subject.isActive = false;
    await subject.save();
    await recordAudit({ req, action: 'subject.deactivate', entity: 'Subject', entityId: subject._id });
    return ok(res, null, `Subject archived (${count} attendance records reference it)`);
  }
  await subject.deleteOne();
  await recordAudit({ req, action: 'subject.delete', entity: 'Subject', entityId: req.params.id });
  return ok(res, null, 'Subject deleted');
});

module.exports = { list, options, getOne, create, update, remove };
