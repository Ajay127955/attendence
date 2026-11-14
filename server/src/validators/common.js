'use strict';

const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const optionalObjectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v));

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().email('Invalid email address');
const phone = z.string().trim().max(30).optional().or(z.literal(''));

const paginationQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  sort: z.string().optional(),
  search: z.string().trim().optional(),
};

module.exports = { z, objectId, optionalObjectId, dateString, password, email, phone, paginationQuery };
