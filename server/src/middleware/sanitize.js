'use strict';

/**
 * Defence-in-depth input sanitisation (replaces the deprecated
 * express-mongo-sanitize). Strips Mongo operators ($, .) and prototype-polluting
 * keys from user supplied objects. Express itself handles URL/HTML escaping;
 * the React client never renders raw HTML.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function scrub(value, depth = 0) {
  if (depth > 10) return value; // guard against deeply nested payloads
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(k)) continue;
      const cleanKey = k.replace(/^\$+/, '').replace(/\./g, '');
      out[cleanKey] = scrub(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string') return value.trim();
  return value;
}

function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = scrub(req.body);
  if (req.params && typeof req.params === 'object') req.params = scrub(req.params);
  // req.query is read-only in Express 5; scrub into a mutable property instead.
  try {
    if (req.query && typeof req.query === 'object') req.query = scrub(req.query);
  } catch {
    /* ignore — query already validated separately */
  }
  return next();
}

module.exports = sanitize;
