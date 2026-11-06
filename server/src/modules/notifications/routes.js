const router = require('express').Router();
const controller = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { z } = require('zod');
const { validate } = require('../../middleware/validate');

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

router.use(requireAuth);
router.get('/', controller.list);
router.post('/read', validate({ body: markReadSchema }), controller.markRead);

module.exports = router;
