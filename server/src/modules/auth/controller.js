const authService = require('./service');
const { signToken, setAuthCookie, clearAuthCookie } = require('../../middleware/auth');
const { ok, created } = require('../../utils/respond');

async function register(req, res) {
  const user = await authService.register(req.body);
  setAuthCookie(res, signToken(user));
  return created(res, { user });
}

async function login(req, res) {
  const { user, companyMembership } = await authService.login(req.body);
  setAuthCookie(res, signToken(user));
  return ok(res, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
}

async function logout(req, res) {
  await authService.logout(req.user.id);
  clearAuthCookie(res);
  return ok(res, { success: true });
}

async function me(req, res) {
  const data = await authService.me(req.user.id);
  return ok(res, { user: data });
}

module.exports = { register, login, logout, me };
