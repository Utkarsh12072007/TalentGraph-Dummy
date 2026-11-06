const companiesService = require('./service');
const { ok, created } = require('../../utils/respond');

async function create(req, res) {
  const company = await companiesService.create(req.user, req.body);
  return created(res, { company });
}

async function getMine(req, res) {
  const membership = await companiesService.getMembership(req.user.id);
  return ok(res, { membership });
}

async function getPublic(req, res) {
  const company = await companiesService.getPublicProfile(req.params.companyId);
  return ok(res, { company });
}

// Member view: same profile but with internal counters.
async function getOne(req, res) {
  const company = await companiesService.getCompanyProfile(req.params.companyId);
  return ok(res, { company });
}

async function update(req, res) {
  const company = await companiesService.update(req.user, req.params.companyId, req.body, req.file);
  return ok(res, { company });
}

async function listMembers(req, res) {
  const members = await companiesService.listMembers(req.params.companyId);
  return ok(res, { members });
}

async function addMember(req, res) {
  const member = await companiesService.addMember(req.user, req.params.companyId, req.body);
  return created(res, { member });
}

async function updateMember(req, res) {
  const member = await companiesService.updateMember(
    req.user, req.params.companyId, req.params.memberId, req.body
  );
  return ok(res, { member });
}

async function removeMember(req, res) {
  const result = await companiesService.removeMember(req.user, req.params.companyId, req.params.memberId);
  return ok(res, result);
}

module.exports = { create, getMine, getPublic, getOne, update, listMembers, addMember, updateMember, removeMember };
