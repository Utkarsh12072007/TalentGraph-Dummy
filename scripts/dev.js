// Development launcher: starts PostgreSQL (if needed), the API server,
// and the Vite dev server — all from one `npm run dev`.
// Each child keeps its own process so `node --watch` and Vite HMR keep
// their fast reload behavior.

const { spawn } = require('child_process');
const path = require('path');
const { execFileSync } = require('child_process');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const PG_CTL = path.join(ROOT, '.pg', 'bin', 'pg_ctl');
const DATA_DIR = path.join(ROOT, 'pgdata');

const children = [];

function spawnChild(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[dev] ${name} exited with code ${code}`);
    }
  });
  children.push({ name, child });
  return child;
}

function postgresRunning() {
  try {
    execFileSync(PG_CTL, ['-D', DATA_DIR, 'status'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function waitForPort(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function tryConnect() {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => { socket.end(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) return reject(new Error(`Port ${port} not ready`));
        setTimeout(tryConnect, 300);
      });
    })();
  });
}

function cleanup() {
  for (const { child } of children) {
    try { child.kill('SIGTERM'); } catch { /* already gone */ }
  }
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

(async () => {
  // 1. PostgreSQL
  if (postgresRunning()) {
    console.log('[dev] PostgreSQL already running');
  } else {
    console.log('[dev] Starting PostgreSQL...');
    execFileSync(PG_CTL, [
      '-D', DATA_DIR,
      '-l', path.join(DATA_DIR, 'server.log'),
      '-o', '-p 5432 -c listen_addresses=127.0.0.1 -c unix_socket_directories=' + DATA_DIR,
      'start',
    ], { stdio: 'pipe' });
  }
  await waitForPort(5432);
  console.log('[dev] PostgreSQL ready on 127.0.0.1:5432');

  // 2. API server (auto-restarts on file changes)
  spawnChild('api', 'node', ['--watch', 'server/src/server.js'], { PORT: '4000', NODE_ENV: 'development' });

  // 3. Frontend dev server (HMR) on port 3000 — the gateway exposes this port.
  await new Promise((r) => setTimeout(r, 700));
  spawnChild('web', 'node', [
    'node_modules/vite/bin/vite.js',
    '--port', '3000',
    '--host', '0.0.0.0',
    '--strictPort',
  ]);

  console.log('[dev] All services started. API on :4000 (internal), web on :3000.');
})();
