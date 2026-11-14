'use strict';

const request = require('supertest');
const app = require('../src/app');
const { User, Class, Student, Subject, Attendance } = require('../src/models');

/** Creates a user directly in the DB and returns it with a plain password. */
async function createUser({ name = 'Test User', email, rollNo, password = 'Passw0rd123', role = 'student', isActive = true } = {}) {
  const user = new User({ name, email, rollNo, role, isActive });
  await user.setPassword(password);
  await user.save();
  return { user, password };
}

async function login(identifier, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ identifier, password });
  return res;
}

/** Convenience: create + login, returning the access token. */
async function authToken(overrides = {}) {
  const { user, password } = await createUser(overrides);
  const res = await login(user.email || user.rollNo, password);
  return { token: res.body.data.accessToken, user, password, res };
}

async function createClass({ name = 'Grade 9', section = 'A', teachers = [], students = [] } = {}) {
  return Class.create({ name, section, academicYear: '2025-2026', teachers, students });
}

async function createSubject({ name = 'Math', code = 'MATH9', classId, teacher = null } = {}) {
  return Subject.create({ name, code, class: classId, teacher });
}

async function createStudent({ rollNo = 'S0001', name = 'Student One', classId, userId = null } = {}) {
  return Student.create({ rollNo, name, class: classId, user: userId });
}

module.exports = { request, app, createUser, login, authToken, createClass, createSubject, createStudent, User, Class, Student, Subject, Attendance };
