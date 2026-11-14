'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Retries a few times before giving up so that
 * container orchestration (Docker/Render) has time to bring Mongo up.
 */
async function connectDB({ uri = env.MONGODB_URI, retries = 3 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      attempt += 1;
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: !env.isProd, // build indexes automatically outside production
      });
      logger.info(`MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err) {
      logger.error(`MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

module.exports = { connectDB, disconnectDB, mongoose };
