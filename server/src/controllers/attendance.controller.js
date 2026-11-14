'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const ApiError = require('../utils/ApiError');
const { Attendance, Student, Subject } = require('../models');
const attendanceService = require('../services/attendance.service');
const { getPagination, buildMeta } = require('../utils/pagination');
const { getSettings } = require('../services/settings.service');
const { toDateOnly, toDateKey, dayjs } = require('../utils/dates');
const { computePercentage } = require('../services/attendanceStats.service');

const mark = asyncHandler(async (req, res) => {
  const doc = await attendanceService.markOne({ ...req.body, user: req.user, req });
  return created(res, doc, 'Attendance saved');
});

const bulkMark = asyncHandler(async (req, res) => {
  const result = await attendanceService.bulkMark({ ...req.body, user: req.user, req });
  return ok(res, result, `Attendance saved for ${result.upserted + result.modified} student(s)`);
});

const roster = asyncHandler(async (req, res) => {
  const data = await attendanceService.getRoster({
    date: req.query.date,
    classId: req.query.classId,
    subjectId: req.query.subjectId || null,
    user: req.user,
  });
  return ok(res, data, 'Class roster');
});

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query, { allowedSort: ['date', 'status', 'createdAt'] });
  const { items, total, page, limit } = await attendanceService.queryAttendance({
    filters: req.query,
    pagination,
    user: req.user,
  });
  return ok(res, items, 'Attendance records', buildMeta({ page, limit, total }));
});

const remove = asyncHandler(async (req, res) => {
  await attendanceService.deleteAttendance(req.params.id, req.user, req);
  return ok(res, null, 'Attendance record deleted');
});

/**
 * Student portal: personal summary + monthly calendar + history.
 * A student may only see their own data; admins/teachers can target any student.
 */
const studentSummary = asyncHandler(async (req, res) => {
  let student;
  if (req.user.role === 'student') {
    student = await Student.findOne({ user: req.user._id }).populate('class', 'name section academicYear');
  } else {
    student = await Student.findById(req.params.id).populate('class', 'name section academicYear');
  }
  if (!student) throw ApiError.notFound('Student profile not found');

  const settings = await getSettings();
  const now = toDateOnly(new Date());
  const monthStart = toDateOnly(dayjs.utc(now).startOf('month').toDate());
  const monthEnd = toDateOnly(dayjs.utc(now).endOf('month').toDate());

  const [allRows, monthRows, subjectRows] = await Promise.all([
    Attendance.find({ student: student._id }).select('status date').lean(),
    Attendance.find({ student: student._id, date: { $gte: monthStart, $lte: monthEnd } })
      .select('status date subject')
      .lean(),
    Attendance.aggregate([
      { $match: { student: student._id } },
      { $group: { _id: { subject: '$subject', status: '$status' }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  allRows.forEach((r) => {
    if (counts[r.status] !== undefined) counts[r.status] += 1;
    counts.total += 1;
  });

  // Subject-wise breakdown
  const subjectMap = new Map();
  for (const row of subjectRows) {
    const key = row._id.subject ? String(row._id.subject) : 'general';
    if (!subjectMap.has(key)) subjectMap.set(key, { subjectId: row._id.subject, present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    const e = subjectMap.get(key);
    if (e[row._id.status] !== undefined) e[row._id.status] += row.count;
    e.total += row.count;
  }
  const subjectIds = [...subjectMap.keys()].filter((k) => k !== 'general');
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name code').lean();
  const subjectNameMap = new Map(subjects.map((s) => [String(s._id), s]));

  const subjectWise = [...subjectMap.entries()].map(([key, stats]) => ({
    subjectId: key === 'general' ? null : key,
    name: key === 'general' ? 'General (no subject)' : subjectNameMap.get(key)?.name || 'Unknown',
    code: key === 'general' ? '—' : subjectNameMap.get(key)?.code || '',
    ...stats,
    percentage: computePercentage(stats, settings),
  }));

  // Monthly calendar: one entry per day that has a record.
  const calendarMap = new Map();
  for (const r of monthRows) {
    const key = toDateKey(r.date);
    const entry = calendarMap.get(key) || { date: key, statuses: [], present: 0, absent: 0, late: 0, excused: 0 };
    entry.statuses.push(r.status);
    entry[r.status] += 1;
    calendarMap.set(key, entry);
  }
  const calendar = [...calendarMap.values()].map((d) => ({
    ...d,
    status: d.absent > 0 ? 'absent' : d.late > 0 ? 'late' : d.present > 0 ? 'present' : 'excused',
  }));

  return ok(
    res,
    {
      student,
      counts,
      percentage: computePercentage(counts, settings),
      minAttendancePercent: settings.minAttendancePercent,
      subjectWise,
      calendar,
      month: dayjs.utc(now).format('YYYY-MM'),
      atRisk: computePercentage(counts, settings) < settings.minAttendancePercent,
    },
    'Student attendance summary'
  );
});

const studentHistory = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query, { allowedSort: ['date'], defaultLimit: 30 });
  let studentId;
  if (req.user.role === 'student') {
    const s = await Student.findOne({ user: req.user._id }).select('_id');
    if (!s) throw ApiError.notFound('Student profile not found');
    studentId = s._id;
  } else {
    studentId = req.params.id;
  }

  const query = { student: studentId };
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = toDateOnly(req.query.from);
    if (req.query.to) query.date.$lte = toDateOnly(req.query.to);
  }
  if (req.query.subjectId) query.subject = req.query.subjectId;

  const [items, total] = await Promise.all([
    Attendance.find(query)
      .populate('subject', 'name code')
      .populate('markedBy', 'name')
      .sort({ date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return ok(res, items, 'Attendance history', buildMeta({ page: pagination.page, limit: pagination.limit, total }));
});

module.exports = { mark, bulkMark, roster, list, remove, studentSummary, studentHistory };
