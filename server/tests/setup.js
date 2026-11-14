'use strict';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

// Connect once for the whole file; collections are cleared between tests.
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB({ retries: 5 });
  }
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
