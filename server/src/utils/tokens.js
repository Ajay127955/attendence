'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Access tokens are short lived and returned in the JSON body.
 * Refresh tokens are long lived, stored httpOnly, and persisted as a hash so
 * a database leak never exposes a usable token.
 */

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'ams',
    jwtid: crypto.randomBytes(16).toString('hex'),
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'ams',
    jwtid: crypto.randomBytes(16).toString('hex'),
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'ams' });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'ams' });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** URL-safe random token for password reset flows. */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Milliseconds until a refresh token expires (for cookie maxAge). */
function refreshTokenTtlMs() {
  const decoded = jwt.decode(signRefreshToken({ sub: 'probe' }));
  return Math.max(0, decoded.exp * 1000 - Date.now());
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  randomToken,
  refreshTokenTtlMs,
};
