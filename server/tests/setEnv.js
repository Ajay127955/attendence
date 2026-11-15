'use strict';

// Environment for the test run. Loaded before any application module so
// src/config/env.js validates against these values.
process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
process.env.MONGODB_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/ams_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.JWT_ACCESS_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.SEED_STUDENT_PASSWORD = 'Student@12345';
process.env.GOOGLE_SHEETS_ENABLED = 'false';
