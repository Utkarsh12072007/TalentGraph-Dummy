const jobsService = require('./service');
const companiesService = require('../companies/service');
const { ok, created, pageMeta } = require('../../utils/respond');
const { ApiError } = require('../../utils/ApiError');

async function create(req, res) {
  const job = await jobsService.create(req.user, req.params.companyId, req.body);
  return created(res, { job });
}

async function update(req, res) {
  const job = await jobsService.update(req.user, req.params.companyId, req.params.jobId, req.body);
  return ok(res, { job });
}

async function changeStatus(req, res) {
  const job = await jobsService.changeStatus(
    req.user, req.params.companyId, req.params.jobId, req.body.status
  );
  return ok(res, { job });
}

async function remove(req, res) {
  const result = await jobsService.remove(req.user, req.params.companyId, req.params.jobId);
  return ok(res, result);
}

async function search(req, res) {
  const { jobs, total, page, limit } = await jobsService.searchPublic(req.validatedQuery);
  return ok(res, { jobs, meta: pageMeta(total, page, limit) });
}

async function listCompanyJobs(req, res) {
  const query = {
    status: req.query.status || undefined,
    q: req.query.q || undefined,
    page: Number(req.query.page || 1),
    limit: Math.min(Number(req.query.limit || 10), 50),
  };
  const result = await jobsService.listCompanyJobs(req.params.companyId, query);
  return ok(res, { jobs: result.jobs, meta: pageMeta(result.total, result.page, result.limit) });
}

// Job detail for any viewer (anonymous visitor, candidate, or company member).
async function getForViewer(req, res) {
  let viewer = req.user || null;

  // Recruiters need their companyId to see drafts of their own company.
  if (viewer?.role === 'RECRUITER') {
    const membership = await companiesService.getMembership(viewer.id);
    viewer = { ...viewer, companyId: membership?.companyId || null };
  }

  const job = await jobsService.getForViewer(req.params.jobId, viewer);
  return ok(res, { job });
}

// Job applications — only members of the company that owns the job.
// The requireCompanyMember middleware has already proven membership.
async function jobApplications(req, res) {
  const job = await jobsService.getOwnedJob(req.params.jobId, req.params.companyId);
  if (job.companyId !== req.companyId) throw ApiError.forbidden();
  return ok(res, { job: jobsService.formatJob(job) });
}

module.exports = { create, update, changeStatus, remove, search, listCompanyJobs, getForViewer, jobApplications };
