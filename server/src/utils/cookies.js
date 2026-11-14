'use strict';

const env = require('../config/env');
const { refreshTokenTtlMs } = require('./tokens');

/**
 * Cookie options tuned for a cross-subdomain deployment
 * (app.mydomain.com → api.mydomain.com):
 *   COOKIE_DOMAIN=.mydomain.com, COOKIE_SECURE=true, COOKIE_SAME_SITE=none|lax
 * In local dev the domain is empty and secure is false so http://localhost works.
 */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.isProd,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: refreshTokenTtlMs(),
  };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...opts } = refreshCookieOptions();
  res.clearCookie('refreshToken', opts);
}

/** Access token is also set as a cookie so the SPA can use credentialed calls. */
function setAccessCookie(res, token) {
  res.cookie('accessToken', token, {
    ...refreshCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
}

function clearAccessCookie(res) {
  const { maxAge: _maxAge, ...opts } = refreshCookieOptions();
  res.clearCookie('accessToken', opts);
}

module.exports = { refreshCookieOptions, setRefreshCookie, clearRefreshCookie, setAccessCookie, clearAccessCookie };
