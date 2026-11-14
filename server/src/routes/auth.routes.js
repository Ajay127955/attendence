'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/auth.validator');
const ctrl = require('../controllers/auth.controller');
const { authLimiter, emailLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with email or roll number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: admin@ams.dev }
 *               password: { type: string, example: Admin@12345 }
 *     responses:
 *       200: { description: Signed in }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.patch('/me', authenticate, validate(v.updateMe), ctrl.updateMe);
router.post('/change-password', authenticate, validate(v.changePassword), ctrl.changePassword);
router.post('/forgot-password', emailLimiter, validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.resetPassword), ctrl.resetPassword);
router.post('/register', authenticate, authorize('admin'), validate(v.register), ctrl.register);

module.exports = router;
