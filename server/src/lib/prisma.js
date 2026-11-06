// Single shared Prisma Client instance.
// Creating one client (instead of one per request) lets Prisma reuse
// database connections through its internal connection pool.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
