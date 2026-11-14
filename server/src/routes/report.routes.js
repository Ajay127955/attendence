'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/report.validator');
const ctrl = require('../controllers/report.controller');

const router = express.Router();
router.use(authenticate, authorize('admin', 'teacher'));

router.get('/summary', validate(v.summary), ctrl.summary);
router.get('/detailed', validate(v.summary), ctrl.detailed);
router.get('/low-attendance', validate(v.lowAttendance), ctrl.lowAttendance);
router.get('/export', validate(v.exportQuery), ctrl.exportReport);

module.exports = router;
