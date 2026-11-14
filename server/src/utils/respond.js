'use strict';

/**
 * Every endpoint answers with the same envelope:
 *   { success, data, message, meta? }
 */
function send(res, { statusCode = 200, data = null, message = 'OK', meta } = {}) {
  const body = { success: true, data, message };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

const ok = (res, data = null, message = 'OK', meta) =>
  send(res, { statusCode: 200, data, message, meta });

const created = (res, data = null, message = 'Created') =>
  send(res, { statusCode: 201, data, message });

const noContent = (res, message = 'Deleted') =>
  send(res, { statusCode: 200, data: null, message });

module.exports = { send, ok, created, noContent };
