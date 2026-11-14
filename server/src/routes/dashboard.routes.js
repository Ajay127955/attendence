'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'teacher'), ctrl.get);

module.exports = router;
