const service = require('./service');
const { ok, created, pageMeta } = require('../../utils/respond');

async function schedule(req, res) {
  return created(res, { interview: await service.schedule(req.user, req.companyId, req.body) });
}

async function update(req, res) {
  return ok(res, { interview: await service.update(req.user, req.companyId, req.params.interviewId, req.body) });
}

async function cancel(req, res) {
  return ok(res, { interview: await service.setStatus(req.user, req.companyId, req.params.interviewId, 'CANCELLED') });
}

async function complete(req, res) {
  return ok(res, { interview: await service.setStatus(req.user, req.companyId, req.params.interviewId, 'COMPLETED') });
}

async function submitFeedback(req, res) {
  return created(res, {
    feedback: await service.submitFeedback(req.user, req.params.interviewId, req.body),
  });
}

async function getOne(req, res) {
  const { interview, isCompanyMember } = await service.getAuthorized(req.user, req.params.interviewId);
  return ok(res, { interview: service.shapeForViewer(interview, isCompanyMember, req.user.id), viewerIsCompany: isCompanyMember });
}

async function listMine(req, res) {
  return ok(res, { interviews: await service.listMine(req.user.id) });
}

async function listForCompany(req, res) {
  const { interviews, total, page, limit } = await service.listForCompany(req.companyId, {
    when: req.query.when || 'all',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
  });
  return ok(res, { interviews, meta: pageMeta(total, page, limit) });
}

module.exports = { schedule, update, cancel, complete, submitFeedback, getOne, listMine, listForCompany };
