'use strict';

const { z, objectId, optionalObjectId, dateString } = require('./common');

const STATUS = z.enum(['present', 'absent', 'late', 'excused']);

const filters = {
  from: dateString.optional(),
  to: dateString.optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  studentId: z.string().optional(),
  status: STATUS.optional(),
  search: z.string().trim().optional(),
};

const summary = { query: z.object({ ...filters }) };

const exportQuery = {
  query: z.object({
    ...filters,
    format: z.enum(['csv', 'excel', 'pdf']).default('csv'),
    type: z.enum(['summary', 'detailed']).default('summary'),
  }),
};

const lowAttendance = {
  query: z.object({
    classId: z.string().optional(),
    threshold: z.coerce.number().min(0).max(100).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
  }),
};

const studentReport = {
  params: z.object({ id: objectId }),
  query: z.object({ from: dateString.optional(), to: dateString.optional() }),
};

module.exports = { summary, exportQuery, lowAttendance, studentReport, objectId, optionalObjectId };
