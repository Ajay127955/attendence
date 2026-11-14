'use strict';

/**
 * Runs once in the Jest main process before any test file.
 * Boots an in-memory MongoDB and exposes its URI to the workers via env.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'ams_test' },
  });
  global.__MONGOD__ = mongod;
  process.env.MONGO_TEST_URI = mongod.getUri('ams_test');
};
