const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole, optionalAuth } = require('../../middleware/auth');
const { requireCompanyMember, requireCompanyRole } = require('../../middleware/company');
const {
  createJobSchema,
  updateJobSchema,
  jobStatusSchema,
  searchJobsSchema,
} = require('./schemas');

// Public: job discovery for visitors and candidates.
router.get('/', validate({ query: searchJobsSchema }), controller.search);
router.get('/:jobId', optionalAuth, controller.getForViewer);

// Company-scoped job management.
router.post(
  '/company/:companyId',
  requireAuth,
  requireRole('RECRUITER'),
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN', 'RECRUITER'),
  validate({ body: createJobSchema }),
  controller.create
);

router.get(
  '/company/:companyId',
  requireAuth,
  requireRole('RECRUITER'),
  requireCompanyMember((req) => req.params.companyId),
  controller.listCompanyJobs
);

router.patch(
  '/company/:companyId/:jobId',
  requireAuth,
  requireRole('RECRUITER'),
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN', 'RECRUITER'),
  validate({ body: updateJobSchema }),
  controller.update
);

router.patch(
  '/company/:companyId/:jobId/status',
  requireAuth,
  requireRole('RECRUITER'),
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN', 'RECRUITER'),
  validate({ body: jobStatusSchema }),
  controller.changeStatus
);

router.delete(
  '/company/:companyId/:jobId',
  requireAuth,
  requireRole('RECRUITER'),
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN', 'RECRUITER'),
  controller.remove
);

module.exports = router;
