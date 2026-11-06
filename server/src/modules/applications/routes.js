const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { attachMyCompany } = require('../../middleware/company');
const { applySchema, applicationStatusSchema, companyListQuerySchema, noteSchema } = require('./schemas');

router.use(requireAuth);

// ---------- candidate ----------
router.post(
  '/',
  requireRole('CANDIDATE'),
  validate({ body: applySchema }),
  controller.apply
);

router.get('/mine', requireRole('CANDIDATE'), controller.listMine);
router.post('/:applicationId/withdraw', requireRole('CANDIDATE'), controller.withdraw);

// ---------- company ----------
router.get(
  '/company',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ query: companyListQuerySchema }),
  controller.listForCompany
);

router.patch(
  '/:applicationId/status',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ body: applicationStatusSchema }),
  controller.changeStatus
);

router.get(
  '/:applicationId/notes',
  requireRole('RECRUITER'),
  attachMyCompany,
  controller.listNotes
);

router.post(
  '/:applicationId/notes',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ body: noteSchema }),
  controller.addNote
);

// ---------- shared detail (authorization inside service) ----------
router.get('/:applicationId', controller.getOne);

module.exports = router;
