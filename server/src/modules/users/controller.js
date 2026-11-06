const usersService = require('./service');
const { ok } = require('../../utils/respond');

async function updateMe(req, res) {
  const user = await usersService.updateMe(req.user.id, req.body);
  return ok(res, { user });
}

async function changePassword(req, res) {
  const result = await usersService.changePassword(req.user.id, req.body);
  return ok(res, result);
}

module.exports = { updateMe, changePassword };
