const router = require('express').Router();
const controller = require('./controller');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { attachMyCompany } = require('../../middleware/company');

router.use(requireAuth);
router.get(
  '/company',
  requireRole('RECRUITER'),
  attachMyCompany,
  controller.companyAnalytics
);

module.exports = router;
