const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/tests/**/*.test.js'],
    setupFiles: ['server/tests/setup.js'],
    globalSetup: ['server/tests/global-setup.js'],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }, // one worker: tests share the truncation flow safely
  },
});
