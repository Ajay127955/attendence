'use strict';

const ApiError = require('../utils/ApiError');
const { Class, Student, Subject } = require('../models');
const { getSettings } = require('./settings.service');
const { dayjs, toDateOnly } = require('../utils/dates');

/**
 * Centralised authorisation helpers for class/subject/student scoping.
 * Admins may act on everything; teachers only on what they are assigned to.
 */

async function teacherClassIds(userId) {
  const [classes, subjects] = await Promise.all([
    Class.find({ teachers: userId }).select('_id').lean(),
    Subject.find({ teacher: userId }).select('class').lean(),
  ]);
  const ids = new Set(classes.map((c) => String(c._id)));
  subjects.forEach((s) => ids.add(String(s.class)));
  return [...ids];
}

async function assertClassAccess(user, classId) {
  if (!classId) throw ApiError.badRequest('classId is required');
  const cls = await Class.findById(classId);
  if (!cls) throw ApiError.notFound('Class not found');
  if (user.role === 'admin') return cls;

  const ids = await teacherClassIds(user._id);
  if (!ids.includes(String(cls._id))) {
    throw ApiError.forbidden('You are not assigned to this class');
  }
  return cls;
}

async function assertSubjectAccess(user, subjectId) {
  const subject = await Subject.findById(subjectId).populate('class', 'name section');
  if (!subject) throw ApiError.notFound('Subject not found');
  if (user.role === 'admin') return subject;
  if (String(subject.teacher) !== String(user._id)) {
    const ids = await teacherClassIds(user._id);
    if (!ids.includes(String(subject.class?._id || subject.class))) {
      throw ApiError.forbidden('You are not assigned to this subject');
    }
  }
  return subject;
}

async function assertStudentAccess(user, studentId) {
  const student = await Student.findById(studentId).populate('class', 'name section');
  if (!student) throw ApiError.notFound('Student not found');
  if (user.role === 'admin') return student;
  if (user.role === 'student') {
    if (String(student.user) !== String(user._id)) {
      throw ApiError.forbidden('You can only access your own records');
    }
    return student;
  }
  const ids = await teacherClassIds(user._id);
  if (!ids.includes(String(student.class?._id || student.class))) {
    throw ApiError.forbidden('This student is not in one of your classes');
  }
  return student;
}

/**
 * Guards the configurable "edit previous days" window for teachers.
 * Admins are never restricted.
 */
async function assertWithinEditWindow(user, date) {
  if (user.role === 'admin') return;
  const settings = await getSettings();
  const target = toDateOnly(date);
  const today = toDateOnly(new Date());
  const diff = dayjs.utc(today).diff(dayjs.utc(target), 'day');
  if (diff > settings.editWindowDays) {
    throw ApiError.forbidden(
      `Attendance can only be edited within the last ${settings.editWindowDays} day(s)`
    );
  }
  if (diff < 0) throw ApiError.badRequest('Cannot mark attendance for a future date');
}

module.exports = {
  teacherClassIds,
  assertClassAccess,
  assertSubjectAccess,
  assertStudentAccess,
  assertWithinEditWindow,
};
