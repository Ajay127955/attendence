'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const hpp = require('hpp');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { mongoose } = require('./config/db');

const app = express();

// Behind a reverse proxy (Render/Railway/Nginx) so rate limiting sees the real IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── Security ────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // the SPA is served separately
  })
);

const isLoopbackOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || '');

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin / server-to-server (no Origin header) and allow-list.
    if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
      return callback(null, true);
    }
    // In development any localhost port is fine: Vite picks the next free port
    // when 5173 is taken, and the SPA is still talking to our own API.
    if (env.isDev && isLoopbackOrigin(origin)) {
      return callback(null, true);
    }
    // Do NOT throw here: a thrown error becomes a 500 for the whole request.
    // Same-origin requests (e.g. the SPA's own `crossorigin` script/link tags)
    // carry an Origin header but perform no CORS check, so simply omitting the
    // Access-Control-Allow-Origin header is correct. Cross-origin callers are
    // still blocked because they receive no ACAO header.
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Parsing / hygiene ───────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(compression());
app.use(sanitize);
app.use(hpp());

if (!env.isTest) {
  app.use(
    morgan(env.isProd ? 'combined' : 'dev', {
      skip: (req) => req.path === '/health' || req.path === '/api/health',
    })
  );
}

// ── Health check (used by Render/Railway/Docker) ────────────
const health = (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  const healthy = mongoose.connection.readyState === 1;
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      uptime: Math.round(process.uptime()),
      db: dbState,
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    message: healthy ? 'Service healthy' : 'Service degraded',
  });
};
app.get('/health', health);
app.get('/api/health', health);

// ── API docs ────────────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AMS API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── API ─────────────────────────────────────────────────────
app.use(env.API_PREFIX, apiLimiter, routes);

// ── Optionally serve the built SPA from this same server ─────
// Enables a single-origin deployment such as
// https://codestorm.dpdns.org/attendence/ where the API lives at
// /api/v1 on the same host — no CORS and no cross-site cookies.
if (env.serveClient) {
  const indexFile = path.join(env.clientDist, 'index.html');
  if (!fs.existsSync(indexFile)) {
    logger.warn(
      `SERVE_CLIENT=true but no SPA build found at ${env.clientDist}. Run "cd client && npm run build" first.`
    );
  } else {
    app.use(env.clientBasePath, express.static(env.clientDist, { index: false, maxAge: '1h' }));

    // SPA fallback: unknown GETs under the base path return index.html so
    // client-side routes (e.g. /attendence/students) deep-link correctly.
    app.get(`${env.clientBasePath}*`, (req, res, next) => {
      if (req.path.startsWith(env.API_PREFIX) || req.path.startsWith('/api/')) return next();
      return res.sendFile(indexFile);
    });
    logger.info(`Serving SPA from ${env.clientDist} at ${env.clientBasePath}`);
  }
}

// ── Errors ──────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
