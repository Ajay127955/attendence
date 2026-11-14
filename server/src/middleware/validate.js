'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Zod validation middleware factory.
 * Validates req.body / req.query / req.params and replaces them with the parsed
 * (typed + stripped) values so controllers always receive clean input.
 */
const validate = (schemas = {}) => (req, _res, next) => {
  const errors = [];
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ field: issue.path.join('.') || key, message: issue.message });
      }
      continue;
    }
    // `req.query` is a getter in some Express versions — assign onto a plain copy.
    if (key === 'query') req.validatedQuery = result.data;
    else req[key] = result.data;
  }

  if (errors.length) {
    return next(ApiError.badRequest('Validation failed', errors));
  }
  return next();
};

module.exports = validate;
