'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { Student, Class, User, Attendance } = require('../models');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { recordAudit } = require('../middleware/audit');
const { importStudentsFromCSV, templateCSV } = require('../services/studentImport.service');
const { aggregateByStudent } = require('../services/attendanceStats.service');
const env = require('../config/env');

const POPULATE = [{ path: 'class', select: 'name section academicYear' }];

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query, {
    allowedSort: ['name', 'rollNo', 'createdAt'],
  });
  const query = {};
  if (req.query.classId) query.class = req.query.classId;
  if (req.query.isActive) query.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ name: rx }, { rollNo: rx }, { email: rx }, { parentContact: rx }];
  }

  // Teachers only see their own classes.
  if (req.user.role === 'teacher') {
    const { teacherClassIds } = require('../services/access.service');
    const ids = await teacherClassIds(req.user._id);
    query.class = req.query.classId ? req.query.classId : { $in: ids };
  }

  const [items, total] = await Promise.all([
    Student.find(query).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
    Student.countDocuments(query),
  ]);

  const stats = await aggregateByStudent(items.map((s) => s._id));
  const withStats = items.map((s) => ({
    ...s,
    attendance: stats.get(String(s._id)) || { total: 0, percentage: 0 },
  }));

  return ok(res, withStats, 'Students', buildMeta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate(POPULATE).lean();
  if (!student) throw ApiError.notFound('Student not found');
  const stats = await aggregateByStudent([student._id]);
  return ok(res, { ...student, attendance: stats.get(String(student._id)) }, 'Student');
});

/** Creates the student, links to a class, and optionally provisions a login. */
async function createStudentRecord(payload, { createAccount = false, password } = {}) {
  const cls = await Class.findById(payload.class);
  if (!cls) throw ApiError.badRequest('Selected class does not exist');

  let account = null;
  if (createAccount) {
    const email = payload.email || `${String(payload.rollNo).toLowerCase()}@student.ams.dev`;
    account = new User({
      name: payload.name,
      email,
      rollNo: String(payload.rollNo).toUpperCase(),
      role: 'student',
      phone: payload.phone || '',
    });
    await account.setPassword(password || env.SEED_STUDENT_PASSWORD);
    await account.save();
  }

  const student = await Student.create({ ...payload, rollNo: String(payload.rollNo).toUpperCase(), user: account?._id || null });
  await Class.findByIdAndUpdate(cls._id, { $addToSet: { students: student._id } });
  return { student, account };
}

const create = asyncHandler(async (req, res) => {
  const { createAccount, ...payload } = req.body;
  const { student, account } = await createStudentRecord(payload, { createAccount });
  await recordAudit({
    req,
    action: 'student.create',
    entity: 'Student',
    entityId: student._id,
    after: { name: student.name, rollNo: student.rollNo },
  });
  return created(res, { student, account: account ? { email: account.email, rollNo: account.rollNo } : null }, 'Student created');
});

const update = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const before = { name: student.name, rollNo: student.rollNo, class: String(student.class) };
  const previousClass = String(student.class);
  Object.assign(student, req.body);
  if (req.body.rollNo) student.rollNo = String(req.body.rollNo).toUpperCase();
  await student.save();

  // Keep the class rosters in sync when the student moves class.
  if (req.body.class && String(req.body.class) !== previousClass) {
    await Class.findByIdAndUpdate(previousClass, { $pull: { students: student._id } });
    await Class.findByIdAndUpdate(req.body.class, { $addToSet: { students: student._id } });
  }

  await recordAudit({ req, action: 'student.update', entity: 'Student', entityId: student._id, before, after: req.body });
  return ok(res, student, 'Student updated');
});

const remove = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  student.isActive = false;
  await student.save();
  if (student.user) await User.updateOne({ _id: student.user }, { $set: { isActive: false } });

  await recordAudit({ req, action: 'student.deactivate', entity: 'Student', entityId: student._id });
  return ok(res, null, 'Student deactivated');
});

const hardRemove = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  await Promise.all([
    Attendance.deleteMany({ student: student._id }),
    Class.findByIdAndUpdate(student.class, { $pull: { students: student._id } }),
    student.user ? User.deleteOne({ _id: student.user }) : Promise.resolve(),
    student.deleteOne(),
  ]);
  await recordAudit({ req, action: 'student.delete', entity: 'Student', entityId: req.params.id, before: { name: student.name } });
  return ok(res, null, 'Student deleted permanently');
});

const importCSV = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No CSV file uploaded (field name: "file")');
  const dryRun = req.query.dryRun === 'true';
  const createAccounts = req.query.createAccounts !== 'false';
  const result = await importStudentsFromCSV(req.file.buffer, { user: req.user, req, dryRun, createAccounts });
  return ok(res, result, dryRun ? 'Import preview generated' : `Imported ${result.createdCount} students`);
});

const downloadTemplate = asyncHandler(async (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student-import-template.csv"');
  return res.send(templateCSV());
});

module.exports = { list, getOne, create, update, remove, hardRemove, importCSV, downloadTemplate };
