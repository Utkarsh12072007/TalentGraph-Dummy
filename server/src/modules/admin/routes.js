const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { listUsersSchema, listCompaniesSchema, auditLogsSchema } = require('./schemas');

// Everything here requires the PLATFORM_ADMIN role — checked on the server.
router.use(requireAuth, requireRole('PLATFORM_ADMIN'));

router.get('/overview', controller.overview);

router.get('/users', validate({ query: listUsersSchema }), controller.listUsers);
router.post('/users/:userId/suspend', controller.suspendUser);
router.post('/users/:userId/reactivate', controller.reactivateUser);

router.get('/companies', validate({ query: listCompaniesSchema }), controller.listCompanies);
router.post('/companies/:companyId/suspend', controller.suspendCompany);
router.post('/companies/:companyId/reactivate', controller.reactivateCompany);

router.get('/audit-logs', validate({ query: auditLogsSchema }), controller.listAuditLogs);

module.exports = router;
