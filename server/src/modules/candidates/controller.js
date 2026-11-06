const service = require('./service');
const { ok, created } = require('../../utils/respond');

const wrap = (fn) => async (req, res) => ok(res, await fn(req.user.id, req.body || {}, req.params));

async function getMyProfile(req, res) {
  return ok(res, { profile: await service.getMyProfile(req.user.id) });
}

async function updateMyProfile(req, res) {
  return ok(res, { profile: await service.updateMyProfile(req.user.id, req.body) });
}

const addEducation = async (req, res) => created(res, { education: await service.addEducation(req.user.id, req.body) });
const updateEducation = async (req, res) => ok(res, { education: await service.updateEducation(req.user.id, req.params.educationId, req.body) });
const removeEducation = async (req, res) => ok(res, await service.removeEducation(req.user.id, req.params.educationId));

const addExperience = async (req, res) => created(res, { experience: await service.addExperience(req.user.id, req.body) });
const updateExperience = async (req, res) => ok(res, { experience: await service.updateExperience(req.user.id, req.params.experienceId, req.body) });
const removeExperience = async (req, res) => ok(res, await service.removeExperience(req.user.id, req.params.experienceId));

const addSkill = async (req, res) => created(res, { skill: await service.addSkill(req.user.id, req.body) });
const removeSkill = async (req, res) => ok(res, await service.removeSkill(req.user.id, req.params.skillId));

const addProject = async (req, res) => created(res, { project: await service.addProject(req.user.id, req.body) });
const updateProject = async (req, res) => ok(res, { project: await service.updateProject(req.user.id, req.params.projectId, req.body) });
const removeProject = async (req, res) => ok(res, await service.removeProject(req.user.id, req.params.projectId));

const addCertification = async (req, res) => created(res, { certification: await service.addCertification(req.user.id, req.body) });
const updateCertification = async (req, res) => ok(res, { certification: await service.updateCertification(req.user.id, req.params.certificationId, req.body) });
const removeCertification = async (req, res) => ok(res, await service.removeCertification(req.user.id, req.params.certificationId));

// Recruiter viewing a candidate profile (company authorization inside service).
async function getForCompany(req, res) {
  const profile = await service.getProfileForCompany(req.params.profileId, req.companyId);
  return ok(res, { profile });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  addEducation, updateEducation, removeEducation,
  addExperience, updateExperience, removeExperience,
  addSkill, removeSkill,
  addProject, updateProject, removeProject,
  addCertification, updateCertification, removeCertification,
  getForCompany,
};
