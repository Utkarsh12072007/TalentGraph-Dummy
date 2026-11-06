const router = require('express').Router();
const controller = require('./controller');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { uploadResume } = require('../../utils/storage');

router.use(requireAuth);

router.get('/', requireRole('CANDIDATE'), controller.listMine);
router.post('/', requireRole('CANDIDATE'), uploadResume.single('file'), controller.upload);
router.patch('/:resumeId/default', requireRole('CANDIDATE'), controller.setDefault);
router.delete('/:resumeId', requireRole('CANDIDATE'), controller.remove);

// Authorized download: owner candidate, or recruiter whose company
// received an application from this candidate.
router.get('/:resumeId/download', controller.download);

module.exports = router;
