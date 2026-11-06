const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { APPLICATION_TRANSITIONS, WITHDRAWABLE_FROM, canTransition } = require('../../utils/transitions');
const { notify, notifyMany } = require('../../utils/notifications');
const { audit } = require('../../utils/audit');

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

const jobCardSelect = {
  select: {
    id: true,
    title: true,
    location: true,
    workMode: true,
    employmentType: true,
    company: { select: { id: true, name: true, logoUrl: true } },
  },
};

// Candidate-facing history: statuses and timestamps only. No recruiter data.
const historySelect = {
  orderBy: { createdAt: 'asc' },
  select: { id: true, previousStatus: true, newStatus: true, createdAt: true },
};

const interviewSelect = {
  orderBy: { scheduledAt: 'asc' },
  select: {
    id: true,
    round: true,
    scheduledAt: true,
    durationMinutes: true,
    type: true,
    locationOrLink: true,
    status: true,
  },
};

// ---------------------------------------------------------------------------
// Candidate actions
// ---------------------------------------------------------------------------

async function apply(user, { jobId, resumeId, coverNote }) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw ApiError.notFound('Candidate profile not found');

  if (!profile.headline || !profile.summary) {
    throw ApiError.badRequest('Complete your profile headline and summary before applying');
  }

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { company: true } });
  // Draft/closed/archived jobs are invisible to candidates — do not leak that they exist.
  if (!job || job.status !== 'PUBLISHED') throw ApiError.notFound('Job not found');
  if (job.deadline && job.deadline < new Date()) {
    throw ApiError.badRequest('The application deadline for this job has passed');
  }

  let resume = null;
  if (resumeId) {
    resume = await prisma.resume.findFirst({
      where: { id: resumeId, candidateProfileId: profile.id },
    });
    if (!resume) throw ApiError.badRequest('Selected resume was not found');
  } else {
    resume = await prisma.resume.findFirst({
      where: { candidateProfileId: profile.id, isDefault: true },
    });
  }

  try {
    const application = await prisma.application.create({
      data: {
        jobId,
        candidateProfileId: profile.id,
        resumeId: resume?.id || null,
        coverNote: coverNote || null,
        status: 'APPLIED',
        history: {
          // The very first history entry: null -> APPLIED.
          create: { previousStatus: null, newStatus: 'APPLIED', changedById: user.id },
        },
      },
      include: { job: jobCardSelect },
    });

    // Let every admin/recruiter of the hiring company know.
    const members = await prisma.companyMember.findMany({
      where: { companyId: job.companyId, role: { in: ['ADMIN', 'RECRUITER'] } },
      select: { userId: true },
    });
    await notifyMany(
      members.map((m) => m.userId),
      {
        type: 'APPLICATION_RECEIVED',
        title: 'New application received',
        message: `${user.fullName} applied for ${job.title}`,
        link: `/recruiter/applications/${application.id}`,
      }
    );

    return application;
  } catch (err) {
    // The database's unique constraint is the real duplicate protection.
    if (err?.code === 'P2002') {
      throw ApiError.conflict('You have already applied to this job');
    }
    throw err;
  }
}

async function listMine(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  return prisma.application.findMany({
    where: { candidateProfileId: profile.id },
    orderBy: { appliedAt: 'desc' },
    include: {
      job: jobCardSelect,
      history: historySelect,
      interviews: interviewSelect,
    },
  });
}

// Withdraw = candidate's own terminal transition. Recorded in history too.
async function withdraw(user, applicationId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
  const application = await prisma.application.findFirst({
    where: { id: applicationId, candidateProfileId: profile?.id },
  });
  if (!application) throw ApiError.notFound('Application not found');
  if (!WITHDRAWABLE_FROM.includes(application.status)) {
    throw ApiError.badRequest('This application can no longer be withdrawn');
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: 'WITHDRAWN',
      history: {
        create: {
          previousStatus: application.status,
          newStatus: 'WITHDRAWN',
          changedById: user.id,
        },
      },
    },
    include: { job: jobCardSelect },
  });

  await audit(user.id, 'APPLICATION_WITHDRAWN', 'Application', applicationId, {
    from: application.status,
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Shared viewer logic
// ---------------------------------------------------------------------------

async function getApplicationOr404(applicationId) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { id: true, title: true, companyId: true, company: { select: { id: true, name: true } } } },
      candidateProfile: { select: { id: true, userId: true } },
    },
  });
  if (!application) throw ApiError.notFound('Application not found');
  return application;
}

// Authorization matrix for a single application:
// - candidate owner  -> sees everything EXCEPT recruiter notes
// - company member   -> sees everything INCLUDING recruiter notes
// - anyone else      -> 403/404
async function getForViewer(viewer, applicationId) {
  const application = await getApplicationOr404(applicationId);

  if (viewer.role === 'CANDIDATE') {
    if (application.candidateProfile.userId !== viewer.id) throw ApiError.forbidden();
    const full = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: jobCardSelect,
        resume: { select: { id: true, originalName: true } },
        history: historySelect,
        interviews: interviewSelect,
      },
    });
    return { application: full, viewerIsCompany: false };
  }

  if (viewer.role === 'RECRUITER') {
    // This path performs its own membership check (it does not go through
    // attachMyCompany), so the suspended-company rule is enforced here too.
    const membership = await prisma.companyMember.findUnique({
      where: { userId: viewer.id },
      include: { company: { select: { status: true } } },
    });
    if (!membership || membership.companyId !== application.job.companyId) {
      throw ApiError.forbidden('This application belongs to another company');
    }
    if (membership.company.status === 'SUSPENDED') {
      throw ApiError.forbidden('This company workspace has been suspended');
    }
    const full = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: jobCardSelect,
        resume: { select: { id: true, originalName: true, sizeBytes: true, createdAt: true } },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { fullName: true } } },
        },
        interviews: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            interviewers: { include: { user: { select: { id: true, fullName: true } } } },
            feedbacks: { include: { interviewer: { select: { id: true, fullName: true } } } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, fullName: true } } },
        },
        candidateProfile: {
          include: {
            user: { select: { fullName: true, email: true, createdAt: true } },
            skills: { include: { skill: true } },
            educations: { orderBy: { startDate: 'desc' } },
            experiences: { orderBy: { startDate: 'desc' } },
            projects: { orderBy: { createdAt: 'desc' } },
            certifications: { orderBy: { issueDate: 'desc' } },
          },
        },
      },
    });
    return { application: full, viewerIsCompany: true };
  }

  throw ApiError.forbidden();
}

// ---------------------------------------------------------------------------
// Company (recruiter) actions — req.companyId comes from attachMyCompany
// ---------------------------------------------------------------------------

async function listForCompany(companyId, { status, jobId, q, page, limit }) {
  const where = {
    job: { companyId },
    ...(status ? { status } : {}),
    ...(jobId ? { jobId } : {}),
    ...(q
      ? {
          OR: [
            { candidateProfile: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
            { candidateProfile: { headline: { contains: q, mode: 'insensitive' } } },
            { candidateProfile: { skills: { some: { skill: { name: { contains: q, mode: 'insensitive' } } } } } },
            { job: { title: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        job: jobCardSelect,
        resume: { select: { id: true } },
        candidateProfile: {
          select: {
            id: true,
            headline: true,
            location: true,
            yearsExperience: true,
            skills: { take: 6, include: { skill: { select: { name: true } } } },
            user: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  return {
    applications: applications.map((a) => ({
      ...a,
      candidate: {
        profileId: a.candidateProfile.id,
        fullName: a.candidateProfile.user.fullName,
        headline: a.candidateProfile.headline,
        location: a.candidateProfile.location,
        yearsExperience: a.candidateProfile.yearsExperience,
        skills: a.candidateProfile.skills.map((s) => s.skill.name),
      },
      candidateProfile: undefined,
      hasResume: Boolean(a.resume),
      resume: undefined,
    })),
    total,
    page,
    limit,
  };
}

// Status change: validated transition + history + candidate notification.
async function changeStatus(actor, companyId, applicationId, status) {
  const application = await getApplicationOr404(applicationId);
  if (application.job.companyId !== companyId) {
    throw ApiError.forbidden('This application belongs to another company');
  }
  if (!canTransition(APPLICATION_TRANSITIONS, application.status, status)) {
    throw ApiError.badRequest(
      `Cannot move from ${application.status} to ${status}. Allowed: ${
        (APPLICATION_TRANSITIONS[application.status] || []).join(', ') || 'none'
      }`
    );
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      history: {
        create: {
          previousStatus: application.status,
          newStatus: status,
          changedById: actor.id,
        },
      },
    },
    include: { job: jobCardSelect },
  });

  await notify(application.candidateProfile.userId, {
    type: 'APPLICATION_STATUS_CHANGED',
    title: 'Application status updated',
    message: `Your application for ${application.job.title} moved to ${status.replace('_', ' ')}`,
    link: `/applications`,
  });

  await audit(actor.id, 'APPLICATION_STATUS_CHANGED', 'Application', applicationId, {
    from: application.status,
    to: status,
    jobId: application.job.id,
  });

  return updated;
}

// Private notes — company-only, never returned to candidates.
async function listNotes(companyId, applicationId) {
  const application = await getApplicationOr404(applicationId);
  if (application.job.companyId !== companyId) throw ApiError.forbidden();
  return prisma.recruiterNote.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, fullName: true } } },
  });
}

async function addNote(actor, companyId, applicationId, content) {
  const application = await getApplicationOr404(applicationId);
  if (application.job.companyId !== companyId) throw ApiError.forbidden();
  const note = await prisma.recruiterNote.create({
    data: { applicationId, authorId: actor.id, content },
    include: { author: { select: { id: true, fullName: true } } },
  });
  return note;
}

module.exports = {
  apply,
  listMine,
  withdraw,
  getForViewer,
  listForCompany,
  changeStatus,
  listNotes,
  addNote,
};
