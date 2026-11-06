// Vitest global setup: creates a dedicated test database (talentgraph_test)
// and pushes the Prisma schema into it. Runs once before all test files.

require('dotenv').config({ override: true });

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const TEST_DB_URL = 'postgresql://talentgraph@127.0.0.1:5432/talentgraph_test';

module.exports = async () => {
  // 1. Ensure the test database exists (connect to the maintenance DB first).
  const admin = new PrismaClient({
    datasources: { db: { url: 'postgresql://talentgraph@127.0.0.1:5432/postgres' } },
  });
  try {
    await admin.$executeRawUnsafe('CREATE DATABASE talentgraph_test OWNER talentgraph');
    console.log('[test] Created database talentgraph_test');
  } catch (err) {
    if (!String(err.message).includes('already exists')) {
      console.warn('[test] CREATE DATABASE:', err.message.split('\n')[0]);
    }
  }
  await admin.$disconnect();

  // 2. Push the current schema into it.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
  console.log('[test] Schema pushed to talentgraph_test');
};
