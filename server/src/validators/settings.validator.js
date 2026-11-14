'use strict';

const { z, objectId, dateString } = require('./common');

const update = {
  body: z.object({
    academicYear: z.string().trim().max(20).optional(),
    minAttendancePercent: z.coerce.number().min(0).max(100).optional(),
    lateCountsAsPresent: z.boolean().optional(),
    editWindowDays: z.coerce.number().int().min(0).max(90).optional(),
    workingDays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    holidays: z
      .array(z.object({ date: dateString, name: z.string().trim().max(120) }))
      .optional(),
    schoolName: z.string().trim().max(160).optional(),
    timezone: z.string().trim().max(60).optional(),
  }),
};

const auditList = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    actor: z.string().optional(),
    from: dateString.optional(),
    to: dateString.optional(),
  }),
};

const auditId = { params: z.object({ id: objectId }) };

module.exports = { update, auditList, auditId };
