const service = require('./service');
const { ok } = require('../../utils/respond');

async function overview(req, res) {
  return ok(res, await service.overview());
}

async function listUsers(req, res) {
  const result = await service.listUsers(req.validatedQuery);
  return ok(res, result);
}

async function suspendUser(req, res) {
  return ok(res, { user: await service.setUserStatus(req.user, req.params.userId, 'SUSPENDED') });
}

async function reactivateUser(req, res) {
  return ok(res, { user: await service.setUserStatus(req.user, req.params.userId, 'ACTIVE') });
}

async function listCompanies(req, res) {
  const result = await service.listCompanies(req.validatedQuery);
  return ok(res, result);
}

async function suspendCompany(req, res) {
  return ok(res, { company: await service.setCompanyStatus(req.user, req.params.companyId, 'SUSPENDED') });
}

async function reactivateCompany(req, res) {
  return ok(res, { company: await service.setCompanyStatus(req.user, req.params.companyId, 'ACTIVE') });
}

async function listAuditLogs(req, res) {
  const result = await service.listAuditLogs(req.validatedQuery);
  return ok(res, result);
}

module.exports = {
  overview, listUsers, suspendUser, reactivateUser,
  listCompanies, suspendCompany, reactivateCompany, listAuditLogs,
};
