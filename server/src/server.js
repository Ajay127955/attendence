'use strict';

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./realtime');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`🚀 AMS API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`📘 API docs: http://localhost:${env.PORT}/api/docs`);
    logger.info(`🩺 Health:   http://localhost:${env.PORT}/health`);
    logger.info(`🌱 Env: ${env.NODE_ENV}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});
