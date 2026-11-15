'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load .env from the server root regardless of the current working directory.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : /^(1|true|yes|on)$/i.test(v)));

const csv = (def) =>
  z
    .string()
    .optional()
    .transform((v) => {
      // Unset/blank falls back to the provided default array as-is.
      if (v === undefined || v === '') return def;
      return v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: csv(['http://localhost:5173']),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: bool(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('AMS <no-reply@ams.dev>'),

  // Default password assigned to student accounts created without one
  // (added by hand or imported from CSV). Set a strong value in production.
  SEED_STUDENT_PASSWORD: z.string().default('Student@12345'),

  GOOGLE_SHEETS_ENABLED: bool(false),
  GOOGLE_SHEETS_ID: z.string().optional().default(''),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(''),
  GOOGLE_PRIVATE_KEY: z.string().optional().default(''),

  // Serve the built SPA from this server (single-origin deployment).
  // Set SERVE_CLIENT=true and CLIENT_BASE_PATH=/attendence/ to publish the whole
  // app at https://codestorm.dpdns.org/attendence/ with no CORS or cookie issues.
  SERVE_CLIENT: bool(false),
  CLIENT_BASE_PATH: z.string().default('/'),
  CLIENT_DIST: z.string().optional().default(''),
});

/** Ensures a base path always has a leading and trailing slash, e.g. "attendence" → "/attendence/". */
function normalizeBasePath(value) {
  let p = String(value || '/').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a mis-configured server should never boot silently.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n✖ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;

const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDev: raw.NODE_ENV === 'development',
  // Google private keys are stored with literal "\n" sequences in env files.
  googlePrivateKey: (raw.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  corsOrigins: raw.CORS_ORIGINS,
  // Static SPA hosting (single-origin deployment).
  serveClient: raw.SERVE_CLIENT,
  clientBasePath: normalizeBasePath(raw.CLIENT_BASE_PATH),
  clientDist: raw.CLIENT_DIST
    ? path.resolve(raw.CLIENT_DIST)
    : path.resolve(__dirname, '../../../client/dist'),
};

module.exports = env;
