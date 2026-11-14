'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: 'system' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true, index: true }, // e.g. attendance.mark
    entity: { type: String, required: true, index: true }, // e.g. Attendance
    entityId: { type: String, default: '' },
    description: { type: String, default: '' },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
