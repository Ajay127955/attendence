'use strict';

const { z, objectId, optionalObjectId, dateString, paginationQuery } = require('./common');

const STATUS = z.enum(['present', 'absent', 'late', 'excused']);

const mark = {
  body: z.object({
    date: dateString,
    classId: objectId,
    subjectId: optionalObjectId,
    studentId: objectId,
    status: STATUS,
    remarks: z.string().trim().max(300).optional(),
  }),
};

const bulkMark = {
  body: z.object({
    date: dateString,
    classId: objectId,
    subjectId: optionalObjectId,
    records: z
      .array(
        z.object({
          studentId: objectId,
          status: STATUS,
          remarks: z.string().trim().max(300).optional(),
        })
      )
      .min(1, 'At least one record is required'),
  }),
};

const roster = {
  query: z.object({
    date: dateString,
    classId: objectId,
    subjectId: z.string().optional(),
  }),
};

const list = {
  query: z.object({
    ...paginationQuery,
    date: dateString.optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    classId: z.string().optional(),
    subjectId: z.string().optional(),
    studentId: z.string().optional(),
    status: STATUS.optional(),
  }),
};

const byId = { params: z.object({ id: objectId }) };

const studentSelf = {
  query: z.object({
    from: dateString.optional(),
    to: dateString.optional(),
    subjectId: z.string().optional(),
  }),
};

module.exports = { mark, bulkMark, roster, list, byId, studentSelf };
