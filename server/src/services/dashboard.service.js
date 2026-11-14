'use strict';

const { Attendance, Student, Class, Subject, User } = require('../models');
const { toDateOnly, toDateKey, dayjs } = require('../utils/dates');
const { getSettings } = require('./settings.service');
const { computePercentage, lowAttendanceStudents } = require('./attendanceStats.service');

/**
 * Everything the admin/teacher dashboard needs, computed in a handful of
 * aggregations so it stays fast as attendance grows.
 */
async function getDashboard({ days = 30 } = {}) {
  const settings = await getSettings();
  const today = toDateOnly(new Date());
  const from = toDateOnly(dayjs.utc(today).subtract(days - 1, 'day').toDate());

  const [totalStudents, totalTeachers, totalClasses, totalSubjects] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    Class.countDocuments({}),
    Subject.countDocuments({ isActive: true }),
  ]);

  const [todayCounts, overallCounts, trend, classWise] = await Promise.all([
    Attendance.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Attendance.aggregate([
      { $match: { date: { $gte: from, $lte: today } } },
      {
        $group: {
          _id: { date: '$date', status: '$status' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    Attendance.aggregate([
      {
        $group: {
          _id: { class: '$class', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const fold = (rows) => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    rows.forEach((r) => {
      if (c[r._id] !== undefined) c[r._id] += r.count;
      c.total += r.count;
    });
    return c;
  };

  const todayStats = fold(todayCounts);
  const overallStats = fold(overallCounts);

  // 30-day trend, one point per calendar day (missing days → 0).
  const trendMap = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayjs.utc(today).subtract(i, 'day').format('YYYY-MM-DD');
    trendMap.set(key, { date: key, present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  }
  for (const row of trend) {
    const key = dayjs.utc(row._id.date).format('YYYY-MM-DD');
    const entry = trendMap.get(key);
    if (!entry) continue;
    if (entry[row._id.status] !== undefined) entry[row._id.status] += row.count;
    entry.total += row.count;
  }
  const trendData = [...trendMap.values()].map((d) => ({
    ...d,
    percentage: computePercentage({ ...d, total: d.total }, settings),
  }));

  // Class-wise percentage
  const classes = await Class.find({}).select('name section').lean();
  const classBuckets = new Map();
  for (const c of classes) {
    classBuckets.set(String(c._id), {
      classId: String(c._id),
      name: `${c.name}-${c.section}`,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    });
  }
  for (const row of classWise) {
    const bucket = classBuckets.get(String(row._id.class));
    if (!bucket) continue;
    if (bucket[row._id.status] !== undefined) bucket[row._id.status] += row.count;
    bucket.total += row.count;
  }
  const classWiseData = [...classBuckets.values()]
    .map((b) => ({ ...b, percentage: computePercentage(b, settings) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const { students: lowAttendance } = await lowAttendanceStudents({ limit: 20 });

  return {
    cards: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      todayPresent: todayStats.present,
      todayAbsent: todayStats.absent,
      todayLate: todayStats.late,
      todayExcused: todayStats.excused,
      todayMarked: todayStats.total,
      todayPercentage: computePercentage(todayStats, settings),
      overallPercentage: computePercentage(overallStats, settings),
      overallTotal: overallStats.total,
    },
    today: todayStats,
    overall: overallStats,
    trend: trendData,
    classWise: classWiseData,
    lowAttendance,
    settings: {
      minAttendancePercent: settings.minAttendancePercent,
      academicYear: settings.academicYear,
      editWindowDays: settings.editWindowDays,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Compact stats for a teacher's own classes. */
async function getTeacherDashboard(user) {
  const { teacherClassIds } = require('./access.service');
  const classIds = await teacherClassIds(user._id);
  const today = toDateOnly(new Date());

  const [todayCounts, overallCounts] = await Promise.all([
    Attendance.aggregate([
      { $match: { date: today, class: { $in: classIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { class: { $in: classIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const fold = (rows) => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    rows.forEach((r) => {
      if (c[r._id] !== undefined) c[r._id] += r.count;
      c.total += r.count;
    });
    return c;
  };

  const classes = await Class.find({ _id: { $in: classIds } })
    .select('name section students')
    .lean();

  const { students: lowAttendance } = await lowAttendanceStudents({ limit: 50 });
  const scoped = lowAttendance.filter((s) => classIds.includes(String(s.class?._id)));

  const settings = await getSettings();
  const todayStats = fold(todayCounts);
  const overallStats = fold(overallCounts);

  return {
    cards: {
      myClasses: classes.length,
      myStudents: classes.reduce((sum, c) => sum + (c.students?.length || 0), 0),
      todayPresent: todayStats.present,
      todayAbsent: todayStats.absent,
      todayLate: todayStats.late,
      todayMarked: todayStats.total,
      todayPercentage: computePercentage(todayStats, settings),
      overallPercentage: computePercentage(overallStats, settings),
    },
    classes: classes.map((c) => ({ _id: c._id, name: `${c.name}-${c.section}`, students: c.students?.length || 0 })),
    lowAttendance: scoped,
    settings: { minAttendancePercent: settings.minAttendancePercent, editWindowDays: settings.editWindowDays },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getDashboard, getTeacherDashboard, toDateKey };
