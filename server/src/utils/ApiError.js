'use strict';

/**
 * Operational error with an HTTP status code and optional field-level details.
 * Anything thrown that is not an ApiError is treated as an unexpected 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource already exists', details) {
    return new ApiError(409, message, details);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message);
  }
}

module.exports = ApiError;
