'use strict';

/**
 * Tiny dependency-free logger. In production it emits single-line JSON so
 * log aggregators (Render, Railway, CloudWatch) can parse it; in dev it is
 * human friendly and colourised.
 */
const env = require('./env');

const COLORS = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

function write(level, message, meta) {
  const ts = new Date().toISOString();
  if (env.isProd) {
    process.stdout.write(
      `${JSON.stringify({ ts, level, message, ...(meta ? { meta } : {}) })}\n`
    );
    return;
  }
  const color = COLORS[level] || '';
  const tag = `${color}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
  const extra = meta ? ` ${JSON.stringify(meta)}` : '';
  process.stdout.write(`${COLORS.debug}${ts}${COLORS.reset} ${tag} ${message}${extra}\n`);
}

module.exports = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
  debug: (m, meta) => (!env.isProd ? write('debug', m, meta) : undefined),
};
