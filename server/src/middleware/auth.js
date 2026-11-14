'use strict';

const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

/**
 * Verifies the Bearer access token, loads the user and attaches it to req.user.
 * Also accepts the token from an httpOnly cookie so the browser app can work
 * without exposing tokens to JS.
 */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.accessToken;

    if (!token) throw ApiError.unauthorized('Authentication token missing');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      throw ApiError.unauthorized(expired ? 'Access token expired' : 'Invalid access token');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Restricts a route to one or more roles. Use after `authenticate`. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires role: ${roles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
