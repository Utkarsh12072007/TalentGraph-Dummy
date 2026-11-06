// Runs the Prisma CLI with the DATABASE_URL from OUR .env.
// (Process environment variables normally win over .env files; hosting
// sandboxes may inject their own DATABASE_URL, so we load ours with
// override and pass it down explicitly.)

require('dotenv').config({ override: true });

const { spawnSync } = require('child_process');

const args = process.argv.slice(2); // e.g. ["db", "push"]
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});
process.exit(result.status || 0);
