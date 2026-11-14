'use strict';

/**
 * Local MongoDB for development — no MongoDB install required.
 *
 * Starts a real mongod process on 127.0.0.1:27017 using the binary that
 * mongodb-memory-server already caches on this machine. Data is written to
 * `.mongo-data/` so it survives restarts (stop with Ctrl+C, start again and
 * your seeded records are still there).
 *
 * Run in its own terminal:  npm run db
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = Number(process.env.MONGO_DEV_PORT || 27017);
const DB_PATH = path.resolve(__dirname, '../../.mongo-data');

async function main() {
  fs.mkdirSync(DB_PATH, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbPath: DB_PATH,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = mongod.getUri();
  /* eslint-disable no-console */
  console.log('\n  ────────────────────────────────────────────────');
  console.log(`   MongoDB ready  →  ${uri}`);
  console.log(`   Data directory →  ${DB_PATH}`);
  console.log('   Press Ctrl+C to stop.');
  console.log('  ────────────────────────────────────────────────\n');
  /* eslint-enable no-console */

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start the development MongoDB:', err);
  process.exit(1);
});
