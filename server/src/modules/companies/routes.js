const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { requireCompanyMember, requireCompanyRole } = require('../../middleware/company');
const { uploadLogo } = require('../../utils/storage');
const { createCompanySchema, updateCompanySchema, addMemberSchema, updateMemberSchema } = require('./schemas');

// Public
router.get('/:companyId/public', controller.getPublic);

// Recruiter workspace management
router.use(requireAuth);

router.post(
  '/',
  requireRole('RECRUITER'),
  validate({ body: createCompanySchema }),
  controller.create
);

router.get('/mine', controller.getMine);

router.patch(
  '/:companyId',
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN'),
  uploadLogo.single('logo'),
  validate({ body: updateCompanySchema }),
  controller.update
);

router.get(
  '/:companyId',
  requireCompanyMember((req) => req.params.companyId),
  controller.getOne
);

// Member management (company admins only)
router.get(
  '/:companyId/members',
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN'),
  controller.listMembers
);

router.post(
  '/:companyId/members',
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN'),
  validate({ body: addMemberSchema }),
  controller.addMember
);

router.patch(
  '/:companyId/members/:memberId',
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN'),
  validate({ body: updateMemberSchema }),
  controller.updateMember
);

router.delete(
  '/:companyId/members/:memberId',
  requireCompanyMember((req) => req.params.companyId),
  requireCompanyRole('ADMIN'),
  controller.removeMember
);

module.exports = router;
