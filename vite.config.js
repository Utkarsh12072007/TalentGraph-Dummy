// Vite dev/build configuration.
// - root is client/ (the SPA lives there)
// - /api and /uploads are proxied to the Express server, so the browser
//   always talks to ONE origin (cookies work naturally, no CORS in dev).

const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],
  publicDir: path.resolve(__dirname, 'client', 'public'),
  build: {
    outDir: path.resolve(__dirname, 'client', 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
});
