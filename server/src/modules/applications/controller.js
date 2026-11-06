const service = require('./service');
const { ok, created, pageMeta } = require('../../utils/respond');

// ---------- candidate ----------
async function apply(req, res) {
  return created(res, { application: await service.apply(req.user, req.body) });
}

async function listMine(req, res) {
  return ok(res, { applications: await service.listMine(req.user.id) });
}

async function withdraw(req, res) {
  return ok(res, { application: await service.withdraw(req.user, req.params.applicationId) });
}

async function getOne(req, res) {
  const { application, viewerIsCompany } = await service.getForViewer(req.user, req.params.applicationId);
  return ok(res, { application, viewerIsCompany });
}

// ---------- company ----------
async function listForCompany(req, res) {
  const query = {
    status: req.query.status || undefined,
    jobId: req.query.jobId || undefined,
    q: req.query.q || undefined,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
  };
  const { applications, total, page, limit } = await service.listForCompany(req.companyId, query);
  return ok(res, { applications, meta: pageMeta(total, page, limit) });
}

async function changeStatus(req, res) {
  const application = await service.changeStatus(
    req.user, req.companyId, req.params.applicationId, req.body.status
  );
  return ok(res, { application });
}

async function listNotes(req, res) {
  return ok(res, { notes: await service.listNotes(req.companyId, req.params.applicationId) });
}

async function addNote(req, res) {
  return created(res, {
    note: await service.addNote(req.user, req.companyId, req.params.applicationId, req.body.content),
  });
}

module.exports = { apply, listMine, withdraw, getOne, listForCompany, changeStatus, listNotes, addNote };
