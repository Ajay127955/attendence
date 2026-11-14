'use strict';

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const env = require('../config/env');

/** 404 handler for unmatched routes. */
function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Maps known error shapes to a consistent envelope + HTTP status. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose: validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
    message = `A record with this ${field} already exists`;
    details = err.keyValue;
  }

  // JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  // Multer (file upload)
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `Upload error: ${err.message}`;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`, {
      stack: env.isProd ? undefined : err.stack,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  const body = {
    success: false,
    data: null,
    message,
  };
  if (details) body.details = details;
  if (!env.isProd && statusCode >= 500) body.stack = err.stack;

  return res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler, mongoose };
