'use strict';

/**
 * Hand-written OpenAPI 3 document served at /api/docs.
 * Keeping it as a plain object avoids an extra build dependency and guarantees
 * the spec always matches the routes that actually exist.
 */

const bearer = [{ bearerAuth: [] }];

const envelope = (dataSchema, description = 'Success') => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: dataSchema,
          message: { type: 'string' },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
    },
  },
});

const errorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
});

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
  { name: 'sort', in: 'query', schema: { type: 'string', example: '-createdAt' } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
];

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Attendance Management System API',
    version: '1.0.0',
    description:
      'REST API for the Attendance Management System. All responses share the `{ success, data, message }` envelope. Authenticate with `POST /auth/login` and send the returned access token as `Bearer`.',
    contact: { name: 'AMS', url: 'https://github.com' },
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Local' },
    { url: 'https://api.mydomain.com/api/v1', description: 'Production' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Students' },
    { name: 'Classes' },
    { name: 'Subjects' },
    { name: 'Attendance' },
    { name: 'Reports' },
    { name: 'Dashboard' },
    { name: 'Settings' },
    { name: 'Audit' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true, example: null },
          message: { type: 'string', example: 'Validation failed' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          rollNo: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'teacher', 'student'] },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Student: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          rollNo: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          class: { type: 'string' },
          parentContact: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Class: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Grade 10' },
          section: { type: 'string', example: 'A' },
          academicYear: { type: 'string', example: '2025-2026' },
          teachers: { type: 'array', items: { type: 'string' } },
          students: { type: 'array', items: { type: 'string' } },
        },
      },
      Subject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Mathematics' },
          code: { type: 'string', example: 'MATH10' },
          class: { type: 'string' },
          teacher: { type: 'string' },
        },
      },
      Attendance: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          date: { type: 'string', format: 'date' },
          class: { type: 'string' },
          subject: { type: 'string', nullable: true },
          student: { type: 'string' },
          status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
          remarks: { type: 'string' },
          markedBy: { type: 'string' },
        },
      },
    },
  },
  security: bearer,
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string', example: 'admin@ams.dev' },
                  password: { type: 'string', example: 'Admin@12345' },
                },
              },
            },
          },
        },
        responses: { 200: envelope({ type: 'object' }), 401: errorResponse('Invalid credentials') },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Rotate refresh token (uses httpOnly cookie)', security: [], responses: { 200: envelope({ type: 'object' }) } },
    },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Sign out', responses: { 200: envelope({ type: 'object' }) } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user + linked student', responses: { 200: envelope({ type: 'object' }) } } },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } } },
        responses: { 200: envelope({ type: 'object' }) },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with emailed token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, token: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: envelope({ type: 'object' }), 400: errorResponse('Invalid token') },
      },
    },
    '/auth/change-password': { post: { tags: ['Auth'], summary: 'Change password', responses: { 200: envelope({ type: 'object' }) } } },
    '/users': {
      get: { tags: ['Users'], summary: 'List users', parameters: paginationParams, responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/User' } }) } },
      post: { tags: ['Users'], summary: 'Create user', responses: { 201: envelope({ $ref: '#/components/schemas/User' }) } },
    },
    '/users/{id}': {
      get: { tags: ['Users'], summary: 'Get user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ $ref: '#/components/schemas/User' }) } },
      patch: { tags: ['Users'], summary: 'Update user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ $ref: '#/components/schemas/User' }) } },
      delete: { tags: ['Users'], summary: 'Deactivate user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ type: 'object' }) } },
    },
    '/students': {
      get: {
        tags: ['Students'],
        summary: 'List students (with attendance %)',
        parameters: [...paginationParams, { name: 'classId', in: 'query', schema: { type: 'string' } }],
        responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Student' } }) },
      },
      post: { tags: ['Students'], summary: 'Create student', responses: { 201: envelope({ $ref: '#/components/schemas/Student' }) } },
    },
    '/students/import': {
      post: {
        tags: ['Students'],
        summary: 'Bulk import students from CSV',
        parameters: [
          { name: 'dryRun', in: 'query', schema: { type: 'boolean' } },
          { name: 'createAccounts', in: 'query', schema: { type: 'boolean', default: true } },
        ],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: envelope({ type: 'object' }) },
      },
    },
    '/students/{id}': {
      get: { tags: ['Students'], summary: 'Get student', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ $ref: '#/components/schemas/Student' }) } },
      patch: { tags: ['Students'], summary: 'Update student', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ $ref: '#/components/schemas/Student' }) } },
      delete: { tags: ['Students'], summary: 'Deactivate student', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ type: 'object' }) } },
    },
    '/classes': {
      get: { tags: ['Classes'], summary: 'List classes', parameters: paginationParams, responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Class' } }) } },
      post: { tags: ['Classes'], summary: 'Create class', responses: { 201: envelope({ $ref: '#/components/schemas/Class' }) } },
    },
    '/classes/options': { get: { tags: ['Classes'], summary: 'Class dropdown options', responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Class' } }) } } },
    '/classes/{id}/teachers': {
      put: { tags: ['Classes'], summary: 'Assign teachers', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: envelope({ $ref: '#/components/schemas/Class' }) } },
    },
    '/subjects': {
      get: { tags: ['Subjects'], summary: 'List subjects', parameters: [...paginationParams, { name: 'classId', in: 'query', schema: { type: 'string' } }], responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Subject' } }) } },
      post: { tags: ['Subjects'], summary: 'Create subject', responses: { 201: envelope({ $ref: '#/components/schemas/Subject' }) } },
    },
    '/attendance': {
      get: { tags: ['Attendance'], summary: 'Query attendance records', parameters: [...paginationParams, { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'classId', in: 'query', schema: { type: 'string' } }, { name: 'studentId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] } }], responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Attendance' } }) } },
    },
    '/attendance/roster': {
      get: { tags: ['Attendance'], summary: 'Class roster pre-filled with existing attendance', parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }, { name: 'classId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'subjectId', in: 'query', schema: { type: 'string' } }], responses: { 200: envelope({ type: 'object' }) } },
    },
    '/attendance/mark': {
      post: { tags: ['Attendance'], summary: 'Mark/update one student (upsert)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['date', 'classId', 'studentId', 'status'], properties: { date: { type: 'string', format: 'date' }, classId: { type: 'string' }, subjectId: { type: 'string', nullable: true }, studentId: { type: 'string' }, status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] }, remarks: { type: 'string' } } } } } }, responses: { 201: envelope({ $ref: '#/components/schemas/Attendance' }) } },
    },
    '/attendance/bulk': {
      post: { tags: ['Attendance'], summary: 'Bulk mark a whole class (upsert)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { date: { type: 'string', format: 'date' }, classId: { type: 'string' }, subjectId: { type: 'string', nullable: true }, records: { type: 'array', items: { type: 'object', properties: { studentId: { type: 'string' }, status: { type: 'string' }, remarks: { type: 'string' } } } } } } } } }, responses: { 200: envelope({ type: 'object' }) } },
    },
    '/attendance/me': { get: { tags: ['Attendance'], summary: 'Student: my attendance summary + calendar', responses: { 200: envelope({ type: 'object' }) } } },
    '/attendance/me/history': { get: { tags: ['Attendance'], summary: 'Student: my attendance history', responses: { 200: envelope({ type: 'array', items: { $ref: '#/components/schemas/Attendance' } }) } } },
    '/reports/summary': {
      get: { tags: ['Reports'], summary: 'Per-student attendance summary', parameters: [{ name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'classId', in: 'query', schema: { type: 'string' } }, { name: 'subjectId', in: 'query', schema: { type: 'string' } }, { name: 'studentId', in: 'query', schema: { type: 'string' } }], responses: { 200: envelope({ type: 'object' }) } },
    },
    '/reports/export': {
      get: { tags: ['Reports'], summary: 'Export report (csv | excel | pdf)', parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'excel', 'pdf'], default: 'csv' } }, { name: 'type', in: 'query', schema: { type: 'string', enum: ['summary', 'detailed'], default: 'summary' } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'classId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'File download' } } },
    },
    '/reports/low-attendance': { get: { tags: ['Reports'], summary: 'Students below the minimum %', responses: { 200: envelope({ type: 'object' }) } } },
    '/dashboard': { get: { tags: ['Dashboard'], summary: 'Dashboard aggregates (cards, trend, class-wise, low attendance)', responses: { 200: envelope({ type: 'object' }) } } },
    '/settings': {
      get: { tags: ['Settings'], summary: 'Get settings', responses: { 200: envelope({ type: 'object' }) } },
      patch: { tags: ['Settings'], summary: 'Update settings (admin)', responses: { 200: envelope({ type: 'object' }) } },
    },
    '/settings/audit-logs': { get: { tags: ['Audit'], summary: 'List audit logs (admin)', parameters: paginationParams, responses: { 200: envelope({ type: 'array', items: { type: 'object' } }) } } },
    '/settings/google-sheets': { get: { tags: ['Settings'], summary: 'Google Sheets sync status', responses: { 200: envelope({ type: 'object' }) } } },
  },
};

module.exports = spec;
