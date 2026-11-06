// Central error handler — the LAST middleware in the chain.
// Every error thrown anywhere in the app funnels into here and leaves
// as one consistent JSON shape: { error: { code, message, details? } }

const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Prisma known errors -> friendly HTTP responses
  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'This record already exists' },
    });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Record not found' },
    });
  }

  // Multer file errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: { code: 'FILE_TOO_LARGE', message: 'File is larger than the allowed size' },
    });
  }

  // Unexpected errors: log server-side, hide internals from the client.
  console.error('[error] Unhandled:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: env.isProd ? 'Something went wrong' : String(err?.message || err),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
