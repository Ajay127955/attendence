'use strict';

const { Attendance, Student } = require('../models');
const { getSettings } = require('./settings.service');

/**
 * Shared attendance maths. Centralised so the dashboard, reports and the
 * student portal all agree on what "percentage" means.
 *
 * Convention (matches Settings.lateCountsAsPresent):
 *   counted  = present + late(if configured) + excused(never penalised? no)
 *   present% = (present + lateIfEnabled) / total * 100
 * Excused absences are excluded from the denominator so approved leave does
 * not lower a student's percentage.
 */

function statusCounts(rows) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0, total: rows.length };
  for (const r of rows) if (counts[r.status] !== undefined) counts[r.status] += 1;
  return counts;
}

function computePercentage(counts, { lateCountsAsPresent = true } = {}) {
  const effective = counts.present + (lateCountsAsPresent ? counts.late : 0);
  const denominator = counts.total - counts.excused;
  if (denominator <= 0) return 0;
  return Math.round((effective / denominator) * 10000) / 100; // 2dp
}

async function getStudentAttendance(studentId) {
  const rows = await Attendance.find({ student: studentId }).select('status date').lean();
  const settings = await getSettings();
  const counts = statusCounts(rows);
  return {
    counts,
    percentage: computePercentage(counts, settings),
  };
}

/**
 * Aggregate attendance per student for a set of students.
 * Returns a Map keyed by student id string.
 */
async function aggregateByStudent(studentIds, filter = {}) {
  const settings = await getSettings();
  const match = { student: { $in: studentIds }, ...filter };
  const pipeline = [
    { $match: match },
    { $group: { _id: { student: '$student', status: '$status' }, count: { $sum: 1 } } },
  ];
  const rows = await Attendance.aggregate(pipeline);

  const map = new Map();
  for (const id of studentIds) map.set(String(id), { present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  for (const r of rows) {
    const key = String(r._id.student);
    if (!map.has(key)) map.set(key, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    const entry = map.get(key);
    if (entry[r._id.status] !== undefined) entry[r._id.status] += r.count;
    entry.total += r.count;
  }

  for (const [, entry] of map) entry.percentage = computePercentage(entry, settings);
  return map;
}

/** Students whose overall percentage is below the configured threshold. */
async function lowAttendanceStudents({ threshold, classId, limit = 100 } = {}) {
  const settings = await getSettings();
  const min = threshold ?? settings.minAttendancePercent;

  const studentFilter = { isActive: true };
  if (classId) studentFilter.class = classId;
  const students = await Student.find(studentFilter)
    .select('name rollNo email class')
    .populate('class', 'name section')
    .lean();

  if (!students.length) return { threshold: min, students: [] };

  const map = await aggregateByStudent(students.map((s) => s._id));

  const result = students
    .map((s) => {
      const stats = map.get(String(s._id)) || { total: 0 };
      return {
        _id: s._id,
        name: s.name,
        rollNo: s.rollNo,
        email: s.email,
        class: s.class,
        total: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        excused: stats.excused,
        percentage: stats.percentage || 0,
      };
    })
    .filter((s) => s.total > 0 && s.percentage < min)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, limit);

  return { threshold: min, students: result };
}

module.exports = {
  statusCounts,
  computePercentage,
  getStudentAttendance,
  aggregateByStudent,
  lowAttendanceStudents,
};
