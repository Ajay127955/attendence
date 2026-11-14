'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { Class, Student, Subject, User } = require('../models');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { recordAudit } = require('../middleware/audit');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query, {
    allowedSort: ['name', 'section', 'academicYear', 'createdAt'],
  });
  const query = {};
  if (req.query.academicYear) query.academicYear = req.query.academicYear;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ name: rx }, { section: rx }];
  }
  if (req.user.role === 'teacher') {
    const { teacherClassIds } = require('../services/access.service');
    query._id = { $in: await teacherClassIds(req.user._id) };
  }

  const [items, total] = await Promise.all([
    Class.find(query)
      .populate('teachers', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Class.countDocuments(query),
  ]);

  const enriched = items.map((c) => ({
    ...c,
    studentCount: c.students?.length || 0,
    teacherCount: c.teachers?.length || 0,
  }));

  return ok(res, enriched, 'Classes', buildMeta({ page, limit, total }));
});

/** Lightweight list for dropdowns (no pagination). */
const options = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'teacher') {
    const { teacherClassIds } = require('../services/access.service');
    query._id = { $in: await teacherClassIds(req.user._id) };
  }
  const items = await Class.find(query).select('name section academicYear').sort('name section').lean();
  return ok(res, items, 'Class options');
});

const getOne = asyncHandler(async (req, res) => {
  const cls = await Class.findById(req.params.id)
    .populate('teachers', 'name email phone')
    .populate({ path: 'students', select: 'name rollNo email phone isActive', options: { sort: { rollNo: 1 } } })
    .lean();
  if (!cls) throw ApiError.notFound('Class not found');
  const subjects = await Subject.find({ class: cls._id }).populate('teacher', 'name').lean();
  return ok(res, { ...cls, subjects }, 'Class');
});

const create = asyncHandler(async (req, res) => {
  const cls = await Class.create(req.body);
  await recordAudit({ req, action: 'class.create', entity: 'Class', entityId: cls._id, after: req.body });
  return created(res, cls, 'Class created');
});

const update = asyncHandler(async (req, res) => {
  const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cls) throw ApiError.notFound('Class not found');
  await recordAudit({ req, action: 'class.update', entity: 'Class', entityId: cls._id, after: req.body });
  return ok(res, cls, 'Class updated');
});

const remove = asyncHandler(async (req, res) => {
  const cls = await Class.findById(req.params.id);
  if (!cls) throw ApiError.notFound('Class not found');
  const studentCount = await Student.countDocuments({ class: cls._id, isActive: true });
  if (studentCount > 0) {
    throw ApiError.conflict(`Cannot delete: ${studentCount} student(s) are still assigned to this class`);
  }
  await Subject.deleteMany({ class: cls._id });
  await cls.deleteOne();
  await recordAudit({ req, action: 'class.delete', entity: 'Class', entityId: req.params.id });
  return ok(res, null, 'Class deleted');
});

/** Assign one or more teachers to a class. */
const assignTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ _id: { $in: req.body.teachers }, role: 'teacher' }).select('_id');
  const cls = await Class.findByIdAndUpdate(
    req.params.id,
    { teachers: teachers.map((t) => t._id) },
    { new: true }
  ).populate('teachers', 'name email');
  if (!cls) throw ApiError.notFound('Class not found');
  await recordAudit({
    req,
    action: 'class.assignTeachers',
    entity: 'Class',
    entityId: cls._id,
    after: { teachers: cls.teachers.map((t) => t.name) },
  });
  return ok(res, cls, 'Teachers assigned');
});

/** Add students to a class in bulk (roster management). */
const addStudents = asyncHandler(async (req, res) => {
  const ids = req.body.students || [];
  const cls = await Class.findById(req.params.id);
  if (!cls) throw ApiError.notFound('Class not found');
  await Student.updateMany({ _id: { $in: ids } }, { $set: { class: cls._id } });
  cls.students = [...new Set([...(cls.students || []).map(String), ...ids.map(String)])];
  await cls.save();
  await recordAudit({ req, action: 'class.addStudents', entity: 'Class', entityId: cls._id, after: { count: ids.length } });
  return ok(res, { studentCount: cls.students.length }, 'Students added to class');
});

module.exports = { list, options, getOne, create, update, remove, assignTeachers, addStudents };
