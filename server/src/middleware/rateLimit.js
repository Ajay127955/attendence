'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const message = { success: false, data: null, message: 'Too many requests, please try again later.' };

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.isTest ? 100000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
});

/** Stricter limiter for credential endpoints (login/register/reset). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 100000 : env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
  keyGenerator: (req) => req.ip,
});

/** In-memory limiter for outbound-email endpoints (reset/forgot password). */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.isTest ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
});

module.exports = { apiLimiter, authLimiter, emailLimiter, ApiError };
