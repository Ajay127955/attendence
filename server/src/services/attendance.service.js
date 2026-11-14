'use strict';

const ApiError = require('../utils/ApiError');
const { Attendance, Student, Class, Subject } = require('../models');
const { toDateOnly, toDateKey } = require('../utils/dates');
const { assertClassAccess, assertWithinEditWindow } = require('./access.service');
const { broadcastAttendance } = require('../realtime');
const { isEnabled: sheetsEnabled, appendRows } = require('./googleSheets.service');
const { recordAudit } = require('../middleware/audit');
const logger = require('../config/logger');

/**
 * Attendance can never be recorded for a date in the future.
 * Uses UTC-midnight normalised dates so the comparison is timezone-stable.
 */
function assertNotFuture(dateOnly) {
  const today = toDateOnly(new Date());
  if (dateOnly.getTime() > today.getTime()) {
    throw ApiError.badRequest('Attendance cannot be marked for a future date');
  }
}

/**
 * Upserts a single attendance record. Because of the unique compound index
 * (date, student, subject) a re-mark updates the existing row rather than
 * creating a duplicate.
 */
async function markOne({ date, classId, subjectId = null, studentId, status, remarks = '', user, req }) {
  const dateOnly = toDateOnly(date);
  if (!dateOnly) throw ApiError.badRequest('A valid date is required');
  if (!Attendance.STATUSES.includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${Attendance.STATUSES.join(', ')}`);
  }
  assertNotFuture(dateOnly);

  await assertClassAccess(user, classId);
  await assertWithinEditWindow(user, dateOnly);

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (String(student.class) !== String(classId)) {
    throw ApiError.badRequest('Student does not belong to the selected class');
  }

  if (subjectId) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found');
    if (String(subject.class) !== String(classId)) {
      throw ApiError.badRequest('Subject does not belong to the selected class');
    }
  }

  const filter = { date: dateOnly, student: studentId, subject: subjectId || null };
  const before = await Attendance.findOne(filter).lean();

  const doc = await Attendance.findOneAndUpdate(
    filter,
    {
      $set: { status, remarks, markedBy: user._id, class: classId, subject: subjectId || null },
      $setOnInsert: { date: dateOnly, student: studentId },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  broadcastAttendance({
    date: toDateKey(dateOnly),
    classId: String(classId),
    studentId: String(student.user || student._id),
    status,
    action: before ? 'updated' : 'created',
  });

  if (sheetsEnabled()) {
    await appendRows([
      {
        date: toDateKey(dateOnly),
        class: await className(classId),
        subject: subjectId ? await subjectName(subjectId) : '',
        rollNo: student.rollNo,
        student: student.name,
        status,
        remarks,
        markedBy: user.name,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  await recordAudit({
    req: req || { user },
    action: before ? 'attendance.update' : 'attendance.mark',
    entity: 'Attendance',
    entityId: doc._id,
    description: `${student.name} marked ${status} on ${toDateKey(dateOnly)}`,
    before: before ? { status: before.status, remarks: before.remarks } : null,
    after: { status, remarks },
  });

  return doc;
}

/**
 * Bulk upsert for a whole class in one round trip.
 * records: [{ studentId, status, remarks? }]
 */
async function bulkMark({ date, classId, subjectId = null, records, user, req }) {
  const dateOnly = toDateOnly(date);
  if (!dateOnly) throw ApiError.badRequest('A valid date is required');
  if (!Array.isArray(records) || !records.length) {
    throw ApiError.badRequest('At least one attendance record is required');
  }
  assertNotFuture(dateOnly);

  await assertClassAccess(user, classId);
  await assertWithinEditWindow(user, dateOnly);

  if (subjectId) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found');
    if (String(subject.class) !== String(classId)) {
      throw ApiError.badRequest('Subject does not belong to the selected class');
    }
  }

  const students = await Student.find({ class: classId }).select('_id name rollNo user').lean();
  const valid = new Map(students.map((s) => [String(s._id), s]));

  const ops = [];
  const skipped = [];
  for (const rec of records) {
    const sid = String(rec.studentId || rec.student || '');
    if (!valid.has(sid)) {
      skipped.push({ studentId: sid, reason: 'Not a student in this class' });
      continue;
    }
    if (!Attendance.STATUSES.includes(rec.status)) {
      skipped.push({ studentId: sid, reason: `Invalid status "${rec.status}"` });
      continue;
    }
    ops.push({
      updateOne: {
        filter: { date: dateOnly, student: rec.studentId, subject: subjectId || null },
        update: {
          $set: {
            status: rec.status,
            remarks: rec.remarks || '',
            markedBy: user._id,
            class: classId,
            subject: subjectId || null,
          },
          $setOnInsert: { date: dateOnly, student: rec.studentId },
        },
        upsert: true,
      },
    });
  }

  if (!ops.length) throw ApiError.badRequest('No valid attendance records to save', skipped);

  const result = await Attendance.bulkWrite(ops, { ordered: false });

  const summary = {
    date: toDateKey(dateOnly),
    classId: String(classId),
    subjectId: subjectId ? String(subjectId) : null,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    skipped,
  };

  broadcastAttendance({
    date: toDateKey(dateOnly),
    classId: String(classId),
    action: 'bulk',
    count: ops.length,
  });

  if (sheetsEnabled()) {
    const cName = await className(classId);
    const sName = subjectId ? await subjectName(subjectId) : '';
    await appendRows(
      ops.map((op) => {
        const s = valid.get(String(op.updateOne.filter.student));
        return {
          date: toDateKey(dateOnly),
          class: cName,
          subject: sName,
          rollNo: s?.rollNo || '',
          student: s?.name || '',
          status: op.updateOne.update.$set.status,
          remarks: op.updateOne.update.$set.remarks,
          markedBy: user.name,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  await recordAudit({
    req: req || { user },
    action: 'attendance.bulkMark',
    entity: 'Attendance',
    entityId: classId,
    description: `Bulk marked ${ops.length} records for ${summary.date}`,
    after: { count: ops.length, upserted: summary.upserted, modified: summary.modified },
  });

  logger.info(`Bulk attendance: ${ops.length} records for class ${classId} on ${summary.date}`);
  return summary;
}

/** Loads a class roster pre-filled with any attendance already recorded. */
async function getRoster({ date, classId, subjectId = null, user }) {
  const dateOnly = toDateOnly(date);
  if (!dateOnly) throw ApiError.badRequest('A valid date is required');
  await assertClassAccess(user, classId);

  const [cls, students, existing] = await Promise.all([
    Class.findById(classId).select('name section academicYear').lean(),
    Student.find({ class: classId, isActive: true }).select('name rollNo email').sort('rollNo').lean(),
    Attendance.find({ date: dateOnly, class: classId, subject: subjectId || null })
      .select('student status remarks')
      .lean(),
  ]);

  const byStudent = new Map(existing.map((a) => [String(a.student), a]));

  return {
    date: toDateKey(dateOnly),
    class: cls,
    subject: subjectId ? await Subject.findById(subjectId).select('name code').lean() : null,
    students: students.map((s) => {
      const rec = byStudent.get(String(s._id));
      return {
        _id: s._id,
        name: s.name,
        rollNo: s.rollNo,
        status: rec ? rec.status : null,
        remarks: rec ? rec.remarks : '',
        recorded: Boolean(rec),
      };
    }),
    summary: {
      total: students.length,
      recorded: existing.length,
    },
  };
}

/** Paginated, filterable attendance query (all roles, scoped). */
async function queryAttendance({ filters, pagination, user }) {
  const { page, limit, skip, sort } = pagination;
  const query = {};
  if (filters.date) query.date = toDateOnly(filters.date);
  if (filters.from || filters.to) {
    query.date = {};
    if (filters.from) query.date.$gte = toDateOnly(filters.from);
    if (filters.to) query.date.$lte = toDateOnly(filters.to);
  }
  if (filters.classId) query.class = filters.classId;
  if (filters.subjectId) query.subject = filters.subjectId;
  if (filters.studentId) query.student = filters.studentId;
  if (filters.status) query.status = filters.status;

  // Role scoping
  if (user.role === 'student') {
    const student = await Student.findOne({ user: user._id }).select('_id');
    if (!student) return { items: [], total: 0, page, limit };
    query.student = student._id;
  } else if (user.role === 'teacher') {
    const { teacherClassIds } = require('./access.service');
    const ids = await teacherClassIds(user._id);
    query.class = filters.classId ? filters.classId : { $in: ids };
    if (filters.classId && !ids.includes(String(filters.classId))) {
      throw ApiError.forbidden('You are not assigned to this class');
    }
  }

  const [items, total] = await Promise.all([
    Attendance.find(query)
      .populate('student', 'name rollNo')
      .populate('class', 'name section')
      .populate('subject', 'name code')
      .populate('markedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function deleteAttendance(id, user, req) {
  const doc = await Attendance.findById(id);
  if (!doc) throw ApiError.notFound('Attendance record not found');
  await assertClassAccess(user, doc.class);
  await doc.deleteOne();
  await recordAudit({
    req: req || { user },
    action: 'attendance.delete',
    entity: 'Attendance',
    entityId: id,
    description: `Deleted attendance record`,
    before: { status: doc.status, date: toDateKey(doc.date) },
  });
  broadcastAttendance({ date: toDateKey(doc.date), classId: String(doc.class), action: 'deleted' });
  return doc;
}

async function className(id) {
  const c = await Class.findById(id).select('name section').lean();
  return c ? `${c.name}-${c.section}` : '';
}
async function subjectName(id) {
  const s = await Subject.findById(id).select('name code').lean();
  return s ? `${s.name} (${s.code})` : '';
}

module.exports = { markOne, bulkMark, getRoster, queryAttendance, deleteAttendance };
