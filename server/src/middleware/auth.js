// Authentication middleware.
//
// Flow: browser sends the JWT inside an HTTP-only cookie -> we verify it ->
// we check the user still exists, is ACTIVE, and that the token's
// tokenVersion matches the user's current tokenVersion (logout increments
// it, instantly revoking older tokens) -> we attach req.user.

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/ApiError');

const COOKIE_NAME = 'tg_token';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tv: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                          // not readable from JavaScript (XSS protection)
    secure: env.isProd,                      // HTTPS-only in production
    sameSite: 'lax',                         // CSRF protection while keeping normal navigation working
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days, matches JWT_EXPIRES_IN
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please sign in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === 'SUSPENDED') {
    throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
  }
  if (payload.tv !== user.tokenVersion) {
    throw ApiError.unauthorized('Session was revoked. Please sign in again.');
  }

  req.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action requires role: ${roles.join(' or ')}`));
  }
  next();
};

// Like requireAuth, but anonymous visitors are allowed through without
// req.user. Used on public endpoints that can personalize when signed in
// (e.g. job details showing "You applied to this job").
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.status === 'ACTIVE' && payload.tv === user.tokenVersion) {
      req.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
    }
  } catch {
    // invalid/expired token -> stay anonymous
  }
  next();
});

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireRole,
  optionalAuth,
};
