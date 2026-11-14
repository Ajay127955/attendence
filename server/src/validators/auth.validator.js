'use strict';

const { z, password, email, phone, paginationQuery } = require('./common');

const login = {
  body: z.object({
    identifier: z.string().trim().min(1, 'Email or roll number is required'),
    password: z.string().min(1, 'Password is required'),
  }),
};

const register = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: email.optional(),
    rollNo: z.string().trim().max(40).optional(),
    password,
    role: z.enum(['admin', 'teacher', 'student']),
    phone,
  }),
};

const changePassword = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  }),
};

const forgotPassword = {
  body: z.object({ email }),
};

const resetPassword = {
  body: z.object({
    email,
    token: z.string().min(10, 'Reset token is required'),
    password,
  }),
};

const updateMe = {
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    phone,
  }),
};

const listUsers = {
  query: z.object({
    ...paginationQuery,
    role: z.enum(['admin', 'teacher', 'student']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};

const createUser = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: email.optional(),
    rollNo: z.string().trim().max(40).optional(),
    password,
    role: z.enum(['admin', 'teacher', 'student']),
    phone,
    isActive: z.boolean().optional(),
  }),
};

const updateUser = {
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: email.optional(),
    phone,
    role: z.enum(['admin', 'teacher', 'student']).optional(),
    isActive: z.boolean().optional(),
    password: password.optional(),
  }),
};

module.exports = {
  login,
  register,
  changePassword,
  forgotPassword,
  resetPassword,
  updateMe,
  listUsers,
  createUser,
  updateUser,
};
