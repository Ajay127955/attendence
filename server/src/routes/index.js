'use strict';

const express = require('express');
const env = require('../config/env');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const studentRoutes = require('./student.routes');
const classRoutes = require('./class.routes');
const subjectRoutes = require('./subject.routes');
const attendanceRoutes = require('./attendance.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');
const settingsRoutes = require('./settings.routes');

const router = express.Router();

router.get('/', (_req, res) =>
  res.json({
    success: true,
    data: {
      name: 'Attendance Management System API',
      version: '1.0.0',
      docs: '/api/docs',
      prefix: env.API_PREFIX,
      endpoints: [
        'auth', 'users', 'students', 'classes', 'subjects',
        'attendance', 'reports', 'dashboard', 'settings', 'audit-logs',
      ],
    },
    message: 'API is running',
  })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
