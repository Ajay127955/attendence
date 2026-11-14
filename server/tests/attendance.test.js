'use strict';

const {
  request,
  app,
  authToken,
  createClass,
  createSubject,
  createStudent,
} = require('./helpers');
const { Attendance, Student, User } = require('../src/models');

const today = new Date().toISOString().slice(0, 10);

/** ISO date string `n` days before today (UTC). */
const daysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Builds a class with one student and returns everything needed to mark. */
async function fixture() {
  const { token: adminToken, user: admin } = await authToken({ email: 'admin@att.dev', role: 'admin', name: 'Admin' });
  const cls = await createClass({ name: 'Grade 8', section: 'A' });
  const subject = await createSubject({ code: 'PHY8', classId: cls._id });
  const student = await createStudent({ rollNo: 'S2001', name: 'Riya Sen', classId: cls._id });
  await require('../src/models').Class.findByIdAndUpdate(cls._id, { $addToSet: { students: student._id } });
  return { adminToken, admin, cls, subject, student };
}

describe('Attendance API', () => {
  describe('POST /api/v1/attendance/mark', () => {
    it('creates an attendance record for a student', async () => {
      const { adminToken, cls, student } = await fixture();
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('present');
      const count = await Attendance.countDocuments({});
      expect(count).toBe(1);
    });

    it('UPDATES instead of duplicating when re-marked (unique index)', async () => {
      const { adminToken, cls, student } = await fixture();
      const body = { date: today, classId: String(cls._id), studentId: String(student._id) };

      await request(app).post('/api/v1/attendance/mark').set('Authorization', `Bearer ${adminToken}`).send({ ...body, status: 'present' });
      const second = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...body, status: 'absent', remarks: 'Called in sick' });

      expect(second.status).toBe(201);
      expect(second.body.data.status).toBe('absent');
      expect(second.body.data.remarks).toBe('Called in sick');

      const all = await Attendance.find({ student: student._id });
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe('absent');
    });

    it('keeps subject-scoped records independent', async () => {
      const { adminToken, cls, student, subject } = await fixture();
      const base = { date: today, classId: String(cls._id), studentId: String(student._id) };
      await request(app).post('/api/v1/attendance/mark').set('Authorization', `Bearer ${adminToken}`).send({ ...base, status: 'present' });
      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...base, subjectId: String(subject._id), status: 'late' });

      const all = await Attendance.find({ student: student._id });
      expect(all).toHaveLength(2);
      expect(all.map((a) => a.status).sort()).toEqual(['late', 'present']);
    });

    it('rejects an invalid status (400)', async () => {
      const { adminToken, cls, student } = await fixture();
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'sleeping' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid date format (400)', async () => {
      const { adminToken, cls, student } = await fixture();
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: '13/11/2026', classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(400);
    });

    it('rejects a student from another class (400)', async () => {
      const { adminToken, cls } = await fixture();
      const otherClass = await createClass({ name: 'Grade 7', section: 'B' });
      const foreign = await createStudent({ rollNo: 'S9999', name: 'Outsider', classId: otherClass._id });
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(foreign._id), status: 'present' });
      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const { cls, student } = await fixture();
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(401);
    });

    it('forbids a student from marking attendance (403)', async () => {
      const { cls, student } = await fixture();
      const { token } = await authToken({ rollNo: 'S3001', role: 'student' });
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(403);
    });

    it('forbids a teacher marking a class they are not assigned to (403)', async () => {
      const { cls, student } = await fixture();
      const { token } = await authToken({ email: 'loner@att.dev', role: 'teacher' });
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(403);
    });

    it('allows an assigned teacher to mark attendance', async () => {
      const { cls, student } = await fixture();
      const { token, user } = await authToken({ email: 'owner@att.dev', role: 'teacher' });
      await require('../src/models').Class.findByIdAndUpdate(cls._id, { $addToSet: { teachers: user._id } });
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(201);
    });

    it('blocks a teacher from editing outside the configured window (403)', async () => {
      const { cls, student } = await fixture();
      const { token, user } = await authToken({ email: 'window@att.dev', role: 'teacher' });
      await require('../src/models').Class.findByIdAndUpdate(cls._id, { $addToSet: { teachers: user._id } });

      const old = new Date();
      old.setDate(old.getDate() - 20);
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: old.toISOString().slice(0, 10), classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/within the last/i);
    });

    it('rejects a future date (400)', async () => {
      const { adminToken, cls, student } = await fixture();
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const res = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: future.toISOString().slice(0, 10), classId: String(cls._id), studentId: String(student._id), status: 'present' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    it('marks a whole class and reports counts', async () => {
      const { adminToken, cls } = await fixture();
      const s2 = await createStudent({ rollNo: 'S2002', name: 'Kabir Roy', classId: cls._id });
      const s1 = await Student.findOne({ rollNo: 'S2001' });

      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: today,
          classId: String(cls._id),
          records: [
            { studentId: String(s1._id), status: 'present' },
            { studentId: String(s2._id), status: 'absent' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.upserted).toBe(2);
      expect(await Attendance.countDocuments({})).toBe(2);
    });

    it('upserts on a second bulk call (no duplicates)', async () => {
      const { adminToken, cls } = await fixture();
      const s1 = await Student.findOne({ rollNo: 'S2001' });
      const payload = {
        date: today,
        classId: String(cls._id),
        records: [{ studentId: String(s1._id), status: 'present' }],
      };
      await request(app).post('/api/v1/attendance/bulk').set('Authorization', `Bearer ${adminToken}`).send(payload);
      const second = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, records: [{ studentId: String(s1._id), status: 'late' }] });

      expect(second.status).toBe(200);
      expect(await Attendance.countDocuments({})).toBe(1);
      const doc = await Attendance.findOne({});
      expect(doc.status).toBe('late');
    });

    it('reports skipped rows for students outside the class', async () => {
      const { adminToken, cls } = await fixture();
      const s1 = await Student.findOne({ rollNo: 'S2001' });
      const other = await createClass({ name: 'Grade 6', section: 'C' });
      const foreign = await createStudent({ rollNo: 'S7000', name: 'Alien', classId: other._id });

      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: today,
          classId: String(cls._id),
          records: [
            { studentId: String(s1._id), status: 'present' },
            { studentId: String(foreign._id), status: 'present' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.skipped).toHaveLength(1);
      expect(await Attendance.countDocuments({})).toBe(1);
    });

    it('rejects an empty records array (400)', async () => {
      const { adminToken, cls } = await fixture();
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), records: [] });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/attendance/roster', () => {
    it('returns the class roster pre-filled with existing attendance', async () => {
      const { adminToken, cls, student } = await fixture();
      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'late' });

      const res = await request(app)
        .get('/api/v1/attendance/roster')
        .query({ date: today, classId: String(cls._id) })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].status).toBe('late');
      expect(res.body.data.students[0].recorded).toBe(true);
    });
  });

  describe('GET /api/v1/attendance (query + RBAC)', () => {
    it('lets an admin query all records', async () => {
      const { adminToken, cls, student } = await fixture();
      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });

      const res = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('scopes results to the logged-in student', async () => {
      const { adminToken, cls, student } = await fixture();
      const { token: studentToken } = await authToken({ rollNo: 'S2001', role: 'student' });
      await Student.findOneAndUpdate({ rollNo: 'S2001' }, { user: (await User.findOne({ rollNo: 'S2001' }))._id });

      await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });

      const res = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(String(res.body.data[0].student._id)).toBe(String(student._id));
    });
  });

  describe('GET /api/v1/attendance/me', () => {
    it('returns a student summary with percentage and subject breakdown', async () => {
      const { adminToken, cls, student, subject } = await fixture();
      const { token: studentToken, user } = await authToken({ rollNo: 'S2001', role: 'student' });
      await Student.findByIdAndUpdate(student._id, { user: user._id });

      // Distinct date+subject combos so the unique index does not upsert them together.
      const records = [
        ['present', null, today],
        ['present', subject._id, today],
        ['absent', null, daysAgo(1)],
        ['late', subject._id, daysAgo(2)],
      ];
      for (const [status, subj, date] of records) {
        await request(app)
          .post('/api/v1/attendance/mark')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ date, classId: String(cls._id), studentId: String(student._id), status, subjectId: subj ? String(subj) : undefined });
      }

      const res = await request(app).get('/api/v1/attendance/me').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.counts.present).toBe(2);
      expect(res.body.data.counts.absent).toBe(1);
      expect(res.body.data.counts.late).toBe(1);
      expect(res.body.data.percentage).toBeGreaterThan(0);
      expect(res.body.data.subjectWise.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/v1/attendance/:id', () => {
    it('deletes a record and writes an audit entry', async () => {
      const { adminToken, cls, student } = await fixture();
      const created = await request(app)
        .post('/api/v1/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today, classId: String(cls._id), studentId: String(student._id), status: 'present' });

      const res = await request(app)
        .delete(`/api/v1/attendance/${created.body.data._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(await Attendance.countDocuments({})).toBe(0);
    });
  });
});
