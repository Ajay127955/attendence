'use strict';

const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * Persists an audit entry. Never throws — auditing must not break a request.
 *   await recordAudit({ req, action: 'student.create', entity: 'Student', entityId, after })
 */
async function recordAudit({ req, action, entity, entityId = '', description = '', before = null, after = null }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id || null,
      actorName: req?.user?.name || 'system',
      actorRole: req?.user?.role || 'system',
      action,
      entity,
      entityId: entityId ? String(entityId) : '',
      description,
      before,
      after,
      ip: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    logger.warn(`Audit log failed: ${err.message}`);
  }
}

module.exports = { recordAudit };
