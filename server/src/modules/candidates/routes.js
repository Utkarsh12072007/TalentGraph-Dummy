const router = require('express').Router();
const controller = require('./controller');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { attachMyCompany } = require('../../middleware/company');
const {
  updateProfileSchema,
  educationSchema,
  educationUpdateSchema,
  experienceSchema,
  experienceUpdateSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
} = require('./schemas');

router.use(requireAuth);

// ---- candidate's own profile ----
router.get('/me/profile', requireRole('CANDIDATE'), controller.getMyProfile);
router.patch('/me/profile', requireRole('CANDIDATE'), validate({ body: updateProfileSchema }), controller.updateMyProfile);

// path, idParam, createSchema, updateSchema, handlers
const sub = (path, idParam, createSchema, updateSchema, add, update, remove) => {
  router.post(`/me/profile/${path}`, requireRole('CANDIDATE'), validate({ body: createSchema }), add);
  router.patch(`/me/profile/${path}/:${idParam}`, requireRole('CANDIDATE'), validate({ body: updateSchema }), update);
  router.delete(`/me/profile/${path}/:${idParam}`, requireRole('CANDIDATE'), remove);
};

sub('educations', 'educationId', educationSchema, educationUpdateSchema, controller.addEducation, controller.updateEducation, controller.removeEducation);
sub('experiences', 'experienceId', experienceSchema, experienceUpdateSchema, controller.addExperience, controller.updateExperience, controller.removeExperience);
sub('projects', 'projectId', projectSchema, projectSchema.partial(), controller.addProject, controller.updateProject, controller.removeProject);
sub('certifications', 'certificationId', certificationSchema, certificationSchema.partial(), controller.addCertification, controller.updateCertification, controller.removeCertification);

router.post('/me/profile/skills', requireRole('CANDIDATE'), validate({ body: skillSchema }), controller.addSkill);
router.delete('/me/profile/skills/:skillId', requireRole('CANDIDATE'), controller.removeSkill);

// ---- recruiter-facing candidate detail (company-scoped) ----
router.get(
  '/:profileId',
  requireRole('RECRUITER'),
  attachMyCompany,
  controller.getForCompany
);

module.exports = router;
