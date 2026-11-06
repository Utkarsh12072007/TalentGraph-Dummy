const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { updateMeSchema, changePasswordSchema } = require('./schemas');

router.use(requireAuth);
router.patch('/me', validate({ body: updateMeSchema }), controller.updateMe);
router.post('/me/password', validate({ body: changePasswordSchema }), controller.changePassword);

module.exports = router;
