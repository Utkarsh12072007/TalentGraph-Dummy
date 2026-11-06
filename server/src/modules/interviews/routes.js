const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { attachMyCompany } = require('../../middleware/company');
const { scheduleSchema, updateSchema, feedbackSchema } = require('./schemas');

router.use(requireAuth);

// ---------- candidate ----------
router.get('/mine', requireRole('CANDIDATE'), controller.listMine);

// ---------- company ----------
router.get(
  '/company',
  requireRole('RECRUITER'),
  attachMyCompany,
  controller.listForCompany
);

router.post(
  '/',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ body: scheduleSchema }),
  controller.schedule
);

router.patch(
  '/:interviewId',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ body: updateSchema }),
  controller.update
);

router.post('/:interviewId/cancel', requireRole('RECRUITER'), attachMyCompany, controller.cancel);
router.post('/:interviewId/complete', requireRole('RECRUITER'), attachMyCompany, controller.complete);

router.post(
  '/:interviewId/feedback',
  requireRole('RECRUITER'),
  attachMyCompany,
  validate({ body: feedbackSchema }),
  controller.submitFeedback
);

// ---------- shared detail ----------
router.get('/:interviewId', controller.getOne);

module.exports = router;
