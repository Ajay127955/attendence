'use strict';

const { z, objectId, paginationQuery } = require('./common');

const list = {
  query: z.object({
    ...paginationQuery,
    classId: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};

const create = {
  body: z.object({
    rollNo: z.string().trim().min(1).max(40),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    class: objectId,
    parentContact: z.string().trim().max(40).optional().or(z.literal('')),
    guardianName: z.string().trim().max(120).optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    address: z.string().trim().max(300).optional().or(z.literal('')),
    createAccount: z.boolean().optional(),
  }),
};

const update = {
  params: z.object({ id: objectId }),
  body: z.object({
    rollNo: z.string().trim().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    class: objectId.optional(),
    parentContact: z.string().trim().max(40).optional().or(z.literal('')),
    guardianName: z.string().trim().max(120).optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    address: z.string().trim().max(300).optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  }),
};

const byId = { params: z.object({ id: objectId }) };

const importQuery = {
  query: z.object({
    dryRun: z.enum(['true', 'false']).optional(),
    createAccounts: z.enum(['true', 'false']).optional(),
  }),
};

module.exports = { list, create, update, byId, importQuery };
