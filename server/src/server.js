// HTTP server entry point. All wiring lives in app.js; this file only
// starts listening and handles graceful shutdown.

const env = require('./config/env');
const { createApp } = require('./app');
const prisma = require('./lib/prisma');

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] TalentGraph API listening on http://127.0.0.1:${env.port} (${env.nodeEnv})`);
});

// Graceful shutdown: stop accepting connections, close Prisma connections.
async function shutdown(signal) {
  console.log(`[server] ${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if something hangs.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
