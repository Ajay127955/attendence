'use strict';

const { z, objectId, paginationQuery } = require('./common');

const list = { query: z.object({ ...paginationQuery, academicYear: z.string().optional() }) };

const create = {
  body: z.object({
    name: z.string().trim().min(1).max(80),
    section: z.string().trim().max(10).optional(),
    academicYear: z.string().trim().max(20).optional(),
    room: z.string().trim().max(40).optional(),
    teachers: z.array(objectId).optional(),
  }),
};

const update = {
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(80).optional(),
    section: z.string().trim().max(10).optional(),
    academicYear: z.string().trim().max(20).optional(),
    room: z.string().trim().max(40).optional(),
    teachers: z.array(objectId).optional(),
  }),
};

const assignTeachers = {
  params: z.object({ id: objectId }),
  body: z.object({ teachers: z.array(objectId).default([]) }),
};

const byId = { params: z.object({ id: objectId }) };

module.exports = { list, create, update, assignTeachers, byId };
