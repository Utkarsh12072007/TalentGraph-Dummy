// Express application assembly.
//
// Request flow:
//   security headers -> cookie parsing -> (optional) dev request log
//   -> static logo files -> API routers (each with its own middleware)
//   -> 404 handler -> central error handler
//
// app.js only WIRES things together. Business logic lives in modules.

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const authRoutes = require('./modules/auth/routes');
const usersRoutes = require('./modules/users/routes');
const companiesRoutes = require('./modules/companies/routes');
const candidatesRoutes = require('./modules/candidates/routes');
const jobsRoutes = require('./modules/jobs/routes');
const applicationsRoutes = require('./modules/applications/routes');
const resumesRoutes = require('./modules/resumes/routes');
const interviewsRoutes = require('./modules/interviews/routes');
const notificationsRoutes = require('./modules/notifications/routes');
const analyticsRoutes = require('./modules/analytics/routes');
const adminRoutes = require('./modules/admin/routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Minimal security headers without an extra dependency.
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Tiny request logger for development (no morgan dependency).
function requestLogger(req, _res, next) {
  if (!env.isTest) console.log(`[api] ${req.method} ${req.originalUrl}`);
  next();
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Company logos are public branding assets -> static.
  // Resumes are NOT here: they are only reachable via authorized API routes.
  app.use('/uploads/logos', express.static(path.join(env.uploadDir, 'logos'), { maxAge: '1d' }));

  app.get('/api/health', (_req, res) =>
    res.json({ data: { status: 'ok', time: new Date().toISOString() } })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/companies', companiesRoutes);
  app.use('/api/candidates', candidatesRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/resumes', resumesRoutes);
  app.use('/api/interviews', interviewsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);

  // Swagger / OpenAPI documentation
  const { serve, setup } = require('swagger-ui-express');
  const openapiDocument = require('./docs/openapi');
  app.use('/api/docs', serve, setup(openapiDocument, { customSiteTitle: 'TalentGraph API' }));
  app.get('/api/openapi.json', (_req, res) => res.json(openapiDocument));

  // Production single-service mode: when the SPA has been built (client/dist),
  // Express serves it on the same origin as the API. One service, one origin —
  // HTTP-only cookies need no SameSite/CORS gymnastics and deep links like
  // /jobs or /recruiter/applications survive a hard refresh via the fallback.
  // Gated on NODE_ENV=production so development (Vite + HMR) and tests are
  // completely unaffected by the presence of a built bundle.
  const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
  if (env.isProd && fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));

    // SPA fallback — AFTER the API routers above, so /api/* still 404s as JSON.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
