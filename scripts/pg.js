// PostgreSQL lifecycle helper.
//
// This project ships with portable PostgreSQL 16 binaries (.pg/, Zonky build)
// because the development machine has no system-wide Postgres and no root.
// The data directory is pgdata/ inside the project, so the database SURVIVES
// restarts. On a machine with a system PostgreSQL you can skip this script
// entirely and just point DATABASE_URL at it.

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const PG_BIN = path.join(ROOT, '.pg', 'bin');
const DATA_DIR = path.join(ROOT, 'pgdata');
const LOG_FILE = path.join(DATA_DIR, 'server.log');
const PORT = 5432;
const START_OPTS = [
  '-p', String(PORT),
  '-c', 'listen_addresses=127.0.0.1',
  '-c', 'unix_socket_directories=' + DATA_DIR,
];

const pgCtl = (args, opts = {}) =>
  execFileSync(path.join(PG_BIN, 'pg_ctl'), ['-D', DATA_DIR, ...args], {
    stdio: 'pipe', encoding: 'utf8', ...opts,
  });

function isRunning() {
  try {
    pgCtl(['status']);
    return true;
  } catch {
    return false;
  }
}

function waitForPort(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function tryConnect() {
      const socket = net.connect(PORT, '127.0.0.1');
      socket.once('connect', () => { socket.end(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) return reject(new Error('PostgreSQL did not become ready in time'));
        setTimeout(tryConnect, 400);
      });
    })();
  });
}

async function up() {
  if (isRunning()) return;
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.error('[pg] No data directory. Run: npm run db:init');
    process.exit(1);
  }
  pgCtl(['-l', LOG_FILE, '-o', START_OPTS.join(' '), 'start']);
  await waitForPort();
}

async function init() {
  if (fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('[pg] Data directory already initialized');
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  execFileSync(
    path.join(PG_BIN, 'initdb'),
    ['-D', DATA_DIR, '-U', 'talentgraph', '-A', 'trust', '-E', 'UTF8'],
    { stdio: 'inherit' }
  );
  await up();
  // Create the application database (single-user mode; no psql in the bundle).
  spawnSync(
    path.join(PG_BIN, 'postgres'),
    ['--single', '-D', DATA_DIR, '-E', 'postgres'],
    { input: 'CREATE DATABASE talentgraph OWNER talentgraph;\n', encoding: 'utf8' }
  );
  console.log('[pg] Database "talentgraph" created');
}

const command = process.argv[2] || 'up';
if (command === 'init') init().catch((e) => { console.error(e); process.exit(1); });
else if (command === 'up') up().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
else if (command === 'stop') { if (isRunning()) pgCtl(['stop', '-m', 'fast']); process.exit(0); }
else if (command === 'status') { console.log(isRunning() ? 'running' : 'stopped'); process.exit(0); }
else { console.error('Usage: node scripts/pg.js [init|up|stop|status]'); process.exit(1); }
