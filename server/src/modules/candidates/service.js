const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { upsertSkillByName } = require('../../utils/skills');

// Everything a candidate owns, in one profile payload.
const PROFILE_INCLUDE = {
  skills: { include: { skill: true }, orderBy: { skill: { name: 'asc' } } },
  educations: { orderBy: { startDate: 'desc' } },
  experiences: { orderBy: { startDate: 'desc' } },
  projects: { orderBy: { createdAt: 'desc' } },
  certifications: { orderBy: { issueDate: 'desc' } },
};

async function getMyProfile(userId) {
  let profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: PROFILE_INCLUDE,
  });
  if (!profile) {
    // Safety net: registration always creates the profile, but if it is
    // missing for any reason we self-heal here.
    profile = await prisma.candidateProfile.create({
      data: { userId },
      include: PROFILE_INCLUDE,
    });
  }
  return profile;
}

async function updateMyProfile(userId, data) {
  const profile = await getMyProfile(userId);
  return prisma.candidateProfile.update({
    where: { id: profile.id },
    data,
    include: PROFILE_INCLUDE,
  });
}

// ---- helpers -------------------------------------------------------------
async function ownedProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Profile not found');
  return profile;
}

// Ensures a row belongs to THIS candidate before reading or mutating it.
async function ownedRow(model, userId, rowId) {
  const profile = await ownedProfile(userId);
  const row = await prisma[model].findFirst({
    where: { id: rowId, profileId: profile.id },
  });
  if (!row) throw ApiError.notFound('Record not found');
  return { profile, row };
}

// ---- education -----------------------------------------------------------
async function addEducation(userId, data) {
  const profile = await ownedProfile(userId);
  return prisma.education.create({ data: { ...data, profileId: profile.id } });
}
async function updateEducation(userId, rowId, data) {
  await ownedRow('education', userId, rowId);
  return prisma.education.update({ where: { id: rowId }, data });
}
async function removeEducation(userId, rowId) {
  await ownedRow('education', userId, rowId);
  await prisma.education.delete({ where: { id: rowId } });
  return { success: true };
}

// ---- experience ----------------------------------------------------------
async function addExperience(userId, data) {
  const profile = await ownedProfile(userId);
  return prisma.experience.create({ data: { ...data, profileId: profile.id } });
}
async function updateExperience(userId, rowId, data) {
  await ownedRow('experience', userId, rowId);
  return prisma.experience.update({ where: { id: rowId }, data });
}
async function removeExperience(userId, rowId) {
  await ownedRow('experience', userId, rowId);
  await prisma.experience.delete({ where: { id: rowId } });
  return { success: true };
}

// ---- skills --------------------------------------------------------------
async function addSkill(userId, { name, level }) {
  const profile = await ownedProfile(userId);
  const skill = await upsertSkillByName(name);
  const existing = await prisma.candidateSkill.findUnique({
    where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
  });
  if (existing) throw ApiError.conflict(`"${skill.name}" is already in your skills`);
  return prisma.candidateSkill.create({
    data: { profileId: profile.id, skillId: skill.id, level: level || null },
    include: { skill: true },
  });
}
async function removeSkill(userId, candidateSkillId) {
  await ownedRow('candidateSkill', userId, candidateSkillId);
  await prisma.candidateSkill.delete({ where: { id: candidateSkillId } });
  return { success: true };
}

// ---- projects ------------------------------------------------------------
async function addProject(userId, data) {
  const profile = await ownedProfile(userId);
  return prisma.project.create({
    data: { ...data, link: data.link || null, profileId: profile.id },
  });
}
async function updateProject(userId, rowId, data) {
  await ownedRow('project', userId, rowId);
  return prisma.project.update({ where: { id: rowId }, data: { ...data, link: data.link || null } });
}
async function removeProject(userId, rowId) {
  await ownedRow('project', userId, rowId);
  await prisma.project.delete({ where: { id: rowId } });
  return { success: true };
}

// ---- certifications ------------------------------------------------------
async function addCertification(userId, data) {
  const profile = await ownedProfile(userId);
  return prisma.certification.create({
    data: { ...data, link: data.link || null, profileId: profile.id },
  });
}
async function updateCertification(userId, rowId, data) {
  await ownedRow('certification', userId, rowId);
  return prisma.certification.update({ where: { id: rowId }, data: { ...data, link: data.link || null } });
}
async function removeCertification(userId, rowId) {
  await ownedRow('certification', userId, rowId);
  await prisma.certification.delete({ where: { id: rowId } });
  return { success: true };
}

// ---- recruiter-facing candidate view -------------------------------------
// A company may view a candidate profile ONLY if that candidate applied to
// at least one of the company's jobs.
async function getProfileForCompany(profileId, companyId) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { id: profileId },
    include: {
      ...PROFILE_INCLUDE,
      user: { select: { fullName: true, email: true, createdAt: true } },
      resumes: { select: { id: true, originalName: true, createdAt: true } },
      applications: {
        where: { job: { companyId } },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          job: { select: { id: true, title: true } },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });
  if (!profile) throw ApiError.notFound('Candidate not found');
  if (profile.applications.length === 0) {
    throw ApiError.forbidden('This candidate has not applied to your company');
  }
  return profile;
}

module.exports = {
  PROFILE_INCLUDE,
  getMyProfile,
  updateMyProfile,
  addEducation,
  updateEducation,
  removeEducation,
  addExperience,
  updateExperience,
  removeExperience,
  addSkill,
  removeSkill,
  addProject,
  updateProject,
  removeProject,
  addCertification,
  updateCertification,
  removeCertification,
  getProfileForCompany,
};
