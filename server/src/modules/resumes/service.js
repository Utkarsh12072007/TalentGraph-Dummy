const path = require('path');
const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { resumePath, removeFileIfExists } = require('../../utils/storage');
const { MAX_RESUMES_PER_CANDIDATE } = require('./schemas');

async function myProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Candidate profile not found');
  return profile;
}

async function listMine(userId) {
  const profile = await myProfile(userId);
  const resumes = await prisma.resume.findMany({
    where: { candidateProfileId: profile.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  });
  return resumes.map(({ _count, ...r }) => ({ ...r, usedByApplications: _count.applications }));
}

async function upload(userId, file) {
  if (!file) throw ApiError.badRequest('Please choose a file to upload');
  const profile = await myProfile(userId);

  const count = await prisma.resume.count({ where: { candidateProfileId: profile.id } });
  if (count >= MAX_RESUMES_PER_CANDIDATE) {
    removeFileIfExists(resumePath(file.filename));
    throw ApiError.badRequest(`You can store up to ${MAX_RESUMES_PER_CANDIDATE} resumes. Delete an older one first.`);
  }

  const isFirst = count === 0;
  return prisma.resume.create({
    data: {
      candidateProfileId: profile.id,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200),
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      isDefault: isFirst, // the first resume becomes the default automatically
    },
  });
}

async function setDefault(userId, resumeId) {
  const profile = await myProfile(userId);
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, candidateProfileId: profile.id },
  });
  if (!resume) throw ApiError.notFound('Resume not found');

  await prisma.$transaction([
    prisma.resume.updateMany({
      where: { candidateProfileId: profile.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.resume.update({ where: { id: resumeId }, data: { isDefault: true } }),
  ]);
  return { success: true };
}

async function remove(userId, resumeId) {
  const profile = await myProfile(userId);
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, candidateProfileId: profile.id },
    include: { _count: { select: { applications: true } } },
  });
  if (!resume) throw ApiError.notFound('Resume not found');
  if (resume._count.applications > 0) {
    throw ApiError.conflict(
      'This resume is attached to one or more applications and cannot be deleted.'
    );
  }

  await prisma.resume.delete({ where: { id: resumeId } });
  removeFileIfExists(resumePath(resume.storedName));
  return { success: true };
}

// Download authorization — the important one:
// 1. the owner candidate, OR
// 2. a member of a company the candidate applied to (any application),
//    which is exactly the "when authorized" rule from the product spec.
// Nobody else (even with the file id) can download it.
async function getForDownload(viewer, resumeId) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { candidateProfile: { select: { id: true, userId: true } } },
  });
  if (!resume) throw ApiError.notFound('Resume not found');

  if (viewer.role === 'CANDIDATE') {
    if (resume.candidateProfile.userId !== viewer.id) {
      throw ApiError.forbidden('You can only download your own resumes');
    }
    return resume;
  }

  if (viewer.role === 'RECRUITER') {
    const membership = await prisma.companyMember.findUnique({ where: { userId: viewer.id } });
    if (!membership) throw ApiError.forbidden('Not authorized to download this resume');

    const application = await prisma.application.findFirst({
      where: {
        candidateProfileId: resume.candidateProfile.id,
        job: { companyId: membership.companyId },
      },
      select: { id: true },
    });
    if (!application) throw ApiError.forbidden('Not authorized to download this resume');
    return resume;
  }

  // Platform admins do not download resumes — candidate data is out of scope.
  throw ApiError.forbidden('Not authorized to download this resume');
}

function absolutePath(resume) {
  return resumePath(resume.storedName);
}

function safeFileName(resume) {
  // Suggest a clean download name: original name + correct extension.
  const ext = path.extname(resume.storedName) || '.pdf';
  const base = path.basename(resume.originalName, path.extname(resume.originalName)) || 'resume';
  return `${base}${ext}`;
}

module.exports = { listMine, upload, setDefault, remove, getForDownload, absolutePath, safeFileName };
