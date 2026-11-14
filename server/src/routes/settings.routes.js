'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/settings.validator');
const ctrl = require('../controllers/settings.controller');
const auditCtrl = require('../controllers/audit.controller');

const router = express.Router();

// Settings readable by all authenticated users (the UI shows the min % etc.).
router.get('/', authenticate, ctrl.get);
router.patch('/', authenticate, authorize('admin'), validate(v.update), ctrl.update);
router.get('/google-sheets', authenticate, authorize('admin'), ctrl.googleSheetsStatus);

// Audit logs (admin only)
router.get('/audit-logs', authenticate, authorize('admin'), validate(v.auditList), auditCtrl.list);
router.get('/audit-logs/:id', authenticate, authorize('admin'), validate(v.auditId), auditCtrl.getOne);

module.exports = router;
