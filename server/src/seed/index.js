'use strict';

/**
 * Seed script — creates a complete, believable demo dataset:
 *   1 admin · 3 teachers · 2 classes · 3 subjects · 40 students · 30 days of attendance
 *
 *   npm run seed           # upsert demo data (safe to re-run)
 *   npm run seed:destroy   # wipe all collections
 */

const env = require('../config/env');
const logger = require('../config/logger');
const { connectDB, disconnectDB, mongoose } = require('../config/db');
const { User, Class, Student, Subject, Attendance, AuditLog, Settings } = require('../models');
const { FIRST_NAMES, LAST_NAMES, TEACHERS, CLASSES, SUBJECTS, statusForStudent } = require('./data');
const { toDateOnly, dayjs } = require('../utils/dates');
const { getSettings } = require('../services/settings.service');

const DAYS_OF_HISTORY = 30;
const STUDENTS_PER_CLASS = 20;

async function destroy() {
  await Promise.all([
    User.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    Subject.deleteMany({}),
    Attendance.deleteMany({}),
    AuditLog.deleteMany({}),
    Settings.deleteMany({}),
  ]);
  logger.info('🗑  All collections cleared');
}

async function upsertUser({ name, email, rollNo, password, role, phone = '' }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name, email, rollNo, role, phone, isActive: true });
    await user.setPassword(password);
    await user.save();
  }
  return user;
}

async function seed() {
  logger.info('🌱 Seeding demo data…');

  await destroy();

  // ── Settings ──────────────────────────────────────────────
  await getSettings();

  // ── Admin ─────────────────────────────────────────────────
  const admin = await upsertUser({
    name: 'Alex Morgan',
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    role: 'admin',
    phone: '9800000001',
  });

  // ── Teachers ──────────────────────────────────────────────
  const teachers = [];
  for (const t of TEACHERS) {
    teachers.push(
      await upsertUser({ ...t, password: env.SEED_TEACHER_PASSWORD, role: 'teacher', phone: '9800000002' })
    );
  }

  // ── Classes ───────────────────────────────────────────────
  const academicYear = (await getSettings()).academicYear;
  const classes = [];
  for (let i = 0; i < CLASSES.length; i += 1) {
    const c = CLASSES[i];
    const cls = await Class.create({
      ...c,
      academicYear,
      teachers: [teachers[i % teachers.length]._id, teachers[(i + 1) % teachers.length]._id],
    });
    classes.push(cls);
  }

  // ── Subjects ──────────────────────────────────────────────
  const subjects = [];
  for (let i = 0; i < SUBJECTS.length; i += 1) {
    const s = SUBJECTS[i];
    for (let c = 0; c < classes.length; c += 1) {
      subjects.push(
        await Subject.create({
          name: s.name,
          code: `${s.code}-${classes[c].section}`,
          credits: s.credits,
          class: classes[c]._id,
          teacher: teachers[(i + c) % teachers.length]._id,
        })
      );
    }
  }

  // ── Students (40) + login accounts ────────────────────────
  const students = [];
  let rollCounter = 1;
  for (const cls of classes) {
    for (let i = 0; i < STUDENTS_PER_CLASS; i += 1) {
      const first = FIRST_NAMES[(rollCounter * 7 + i) % FIRST_NAMES.length];
      const last = LAST_NAMES[(rollCounter * 3 + i) % LAST_NAMES.length];
      const name = `${first} ${last}`;
      const rollNo = `S${String(rollCounter).padStart(4, '0')}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${rollCounter}@student.ams.dev`;

      const account = new User({
        name,
        email,
        rollNo,
        role: 'student',
        phone: `98${String(10000000 + rollCounter).slice(0, 8)}`,
        isActive: true,
      });
      await account.setPassword(env.SEED_STUDENT_PASSWORD);
      await account.save();

      const student = await Student.create({
        rollNo,
        name,
        email,
        phone: account.phone,
        class: cls._id,
        parentContact: `97${String(20000000 + rollCounter).slice(0, 8)}`,
        guardianName: `${LAST_NAMES[(rollCounter * 5) % LAST_NAMES.length]} Family`,
        gender: i % 2 === 0 ? 'male' : 'female',
        address: `${rollCounter} Palm Street, Springfield`,
        isActive: true,
        user: account._id,
      });

      students.push({ student, classId: cls._id, rollCounter });
      cls.students.push(student._id);
      rollCounter += 1;
    }
    await cls.save();
  }

  // ── 30 days of attendance ─────────────────────────────────
  const settings = await getSettings();
  const workingDays = new Set(settings.workingDays);
  const today = toDateOnly(new Date());
  const docs = [];

  // Give ~15% of students a persistent low-attendance bias so the
  // "below 75%" report has real entries.
  const biased = new Set(
    students.filter((_, idx) => idx % 7 === 0).map((s) => String(s.student._id))
  );

  for (let d = DAYS_OF_HISTORY - 1; d >= 0; d -= 1) {
    const date = toDateOnly(dayjs.utc(today).subtract(d, 'day').toDate());
    if (!workingDays.has(date.getUTCDay())) continue; // skip weekends

    for (const entry of students) {
      const { student, classId } = entry;
      const bias = biased.has(String(student._id)) ? 0.32 : 0;
      // Class-wide record (subject = null) …
      docs.push({
        date,
        class: classId,
        subject: null,
        student: student._id,
        status: statusForStudent(bias),
        markedBy: teachers[0]._id,
        remarks: '',
      });
      // … plus a per-subject record for two subjects.
      for (const subject of subjects.filter((s) => String(s.class) === String(classId)).slice(0, 2)) {
        docs.push({
          date,
          class: classId,
          subject: subject._id,
          student: student._id,
          status: statusForStudent(bias),
          markedBy: subject.teacher,
          remarks: '',
        });
      }
    }
  }

  // Insert in chunks so a large seed stays within memory limits.
  const CHUNK = 2000;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Attendance.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
  }

  await AuditLog.create({
    actor: admin._id,
    actorName: admin.name,
    actorRole: 'admin',
    action: 'system.seed',
    entity: 'System',
    description: `Seeded ${students.length} students, ${subjects.length} subjects and ${docs.length} attendance records`,
  });

  logger.info('✅ Seed complete');
  logger.info(`   Users:      ${1 + teachers.length + students.length}`);
  logger.info(`   Classes:    ${classes.length}`);
  logger.info(`   Subjects:   ${subjects.length}`);
  logger.info(`   Students:   ${students.length}`);
  logger.info(`   Attendance: ${docs.length} records over ${DAYS_OF_HISTORY} days`);

  // Demo credentials — printed so the app is usable immediately.
  const demoStudent = students[0].student;
  /* eslint-disable no-console */
  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  🔑  DEMO LOGIN CREDENTIALS                                  │
├──────────────────────────────────────────────────────────────┤
│  ADMIN     ${env.SEED_ADMIN_EMAIL.padEnd(46)}│
│            ${env.SEED_ADMIN_PASSWORD.padEnd(46)}│
├──────────────────────────────────────────────────────────────┤
│  TEACHER   ${TEACHERS[0].email.padEnd(46)}│
│            ${env.SEED_TEACHER_PASSWORD.padEnd(46)}│
├──────────────────────────────────────────────────────────────┤
│  STUDENT   ${String(demoStudent.rollNo).padEnd(46)}│
│            ${env.SEED_STUDENT_PASSWORD.padEnd(46)}│
│            (login with roll number OR email)                 │
└──────────────────────────────────────────────────────────────┘
`);
  /* eslint-enable no-console */
}

async function main() {
  await connectDB();
  if (process.argv.includes('--destroy')) {
    await destroy();
  } else {
    await seed();
  }
  await disconnectDB();
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
