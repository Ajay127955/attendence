'use strict';

const { z, objectId, optionalObjectId, paginationQuery } = require('./common');

const list = {
  query: z.object({ ...paginationQuery, classId: z.string().optional(), teacherId: z.string().optional() }),
};

const create = {
  body: z.object({
    name: z.string().trim().min(1).max(120),
    code: z.string().trim().min(1).max(30),
    class: objectId,
    teacher: optionalObjectId,
    credits: z.coerce.number().min(0).max(20).optional(),
  }),
};

const update = {
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().min(1).max(30).optional(),
    class: objectId.optional(),
    teacher: optionalObjectId,
    credits: z.coerce.number().min(0).max(20).optional(),
    isActive: z.boolean().optional(),
  }),
};

const byId = { params: z.object({ id: objectId }) };

module.exports = { list, create, update, byId };
