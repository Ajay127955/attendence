'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/attendance.validator');
const ctrl = require('../controllers/attendance.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', validate(v.list), ctrl.list);
router.get('/roster', authorize('admin', 'teacher'), validate(v.roster), ctrl.roster);
router.get('/me', authorize('student'), validate(v.studentSelf), ctrl.studentSummary);
router.get('/me/history', authorize('student'), validate(v.studentSelf), ctrl.studentHistory);
router.get('/student/:id', authorize('admin', 'teacher'), validate(v.byId), ctrl.studentSummary);
router.get('/student/:id/history', authorize('admin', 'teacher'), validate(v.byId), ctrl.studentHistory);

router.post('/mark', authorize('admin', 'teacher'), validate(v.mark), ctrl.mark);
router.post('/bulk', authorize('admin', 'teacher'), validate(v.bulkMark), ctrl.bulkMark);
router.delete('/:id', authorize('admin', 'teacher'), validate(v.byId), ctrl.remove);

module.exports = router;
