const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { APPLICATION_TRANSITIONS, canTransition } = require('../../utils/transitions');
const { notify, notifyMany } = require('../../utils/notifications');
const { audit } = require('../../utils/audit');

const INTERVIEW_INCLUDE = {
  application: {
    select: {
      id: true,
      status: true,
      job: { select: { id: true, title: true, companyId: true, company: { select: { id: true, name: true, logoUrl: true } } } },
      candidateProfile: {
        select: { id: true, userId: true, headline: true, user: { select: { fullName: true } } },
      },
    },
  },
  interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
  feedbacks: { include: { interviewer: { select: { id: true, fullName: true } } } },
};

// Loads an interview and proves the viewer is either the candidate of the
// underlying application or a member of the hiring company.
async function getAuthorized(viewer, interviewId) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: INTERVIEW_INCLUDE,
  });
  if (!interview) throw ApiError.notFound('Interview not found');

  const companyId = interview.application.job.companyId;

  if (viewer.role === 'CANDIDATE') {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: viewer.id } });
    if (!profile || profile.id !== interview.application.candidateProfile.id) {
      throw ApiError.forbidden();
    }
    return { interview, isCompanyMember: false, companyId: null };
  }

  if (viewer.role === 'RECRUITER') {
    const membership = await prisma.companyMember.findUnique({ where: { userId: viewer.id } });
    if (!membership || membership.companyId !== companyId) {
      throw ApiError.forbidden('This interview belongs to another company');
    }
    return { interview, isCompanyMember: true, companyId, companyRole: membership.role };
  }

  throw ApiError.forbidden();
}

// Candidates must never see feedback; recruiters do.
function shapeForViewer(interview, isCompanyMember, viewerId) {
  if (isCompanyMember) return interview;
  const { feedbacks, ...rest } = interview;
  return rest; // feedbacks stripped
}

async function schedule(actor, companyId, data) {
  const application = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: {
      job: { select: { companyId: true, title: true } },
      candidateProfile: { select: { id: true, userId: true } },
    },
  });
  if (!application) throw ApiError.notFound('Application not found');
  if (application.job.companyId !== companyId) {
    throw ApiError.forbidden('This application belongs to another company');
  }

  // Interviewers must be members of THIS company.
  if (data.interviewerIds.length > 0) {
    const members = await prisma.companyMember.findMany({
      where: { companyId, userId: { in: data.interviewerIds } },
      select: { userId: true },
    });
    if (members.length !== new Set(data.interviewerIds).size) {
      throw ApiError.badRequest('One or more interviewers are not members of your company');
    }
  }

  const roundCount = await prisma.interview.count({ where: { applicationId: application.id } });
  const round = data.round || roundCount + 1;

  // Create the interview AND (when legal) move the pipeline in one
  // transaction, so a failure cannot leave the two out of sync.
  const interview = await prisma.$transaction(async (tx) => {
    const created = await tx.interview.create({
      data: {
        applicationId: application.id,
        round,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        type: data.type,
        locationOrLink: data.locationOrLink || null,
        createdById: actor.id,
        interviewers: {
          create: data.interviewerIds.map((userId) => ({ userId })),
        },
      },
    });

    if (canTransition(APPLICATION_TRANSITIONS, application.status, 'INTERVIEW')) {
      await tx.application.update({
        where: { id: application.id },
        data: {
          status: 'INTERVIEW',
          history: {
            create: {
              previousStatus: application.status,
              newStatus: 'INTERVIEW',
              changedById: actor.id,
            },
          },
        },
      });
    }

    return created;
  });

  // Re-fetch with the full shape the API returns.
  const full = await prisma.interview.findUnique({
    where: { id: interview.id },
    include: INTERVIEW_INCLUDE,
  });

  const when = data.scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  await notify(application.candidateProfile.userId, {
    type: 'INTERVIEW_SCHEDULED',
    title: 'Interview scheduled',
    message: `Round ${round} ${data.type.replace('_', ' ')} for ${application.job.title} — ${when}`,
    link: '/interviews',
  });
  await notifyMany(data.interviewerIds, {
    type: 'INTERVIEWER_ASSIGNED',
    title: 'You were assigned to an interview',
    message: `Round ${round} for ${application.job.title} — ${when}`,
    link: '/recruiter/interviews',
  });

  await audit(actor.id, 'INTERVIEW_SCHEDULED', 'Interview', interview.id, {
    applicationId: application.id,
    round,
  });

  return full;
}

async function update(actor, companyId, interviewId, data) {
  const { interview } = await getAuthorized(actor, interviewId);
  if (interview.status === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled interviews cannot be edited');
  }

  if (data.interviewerIds) {
    const members = await prisma.companyMember.findMany({
      where: { companyId, userId: { in: data.interviewerIds } },
      select: { userId: true },
    });
    if (members.length !== new Set(data.interviewerIds).size) {
      throw ApiError.badRequest('One or more interviewers are not members of your company');
    }
  }

  const { interviewerIds, ...fields } = data;
  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      ...fields,
      ...(interviewerIds
        ? { interviewers: { deleteMany: {}, create: interviewerIds.map((userId) => ({ userId })) } }
        : {}),
    },
    include: INTERVIEW_INCLUDE,
  });

  if (data.scheduledAt) {
    await notify(interview.application.candidateProfile.userId, {
      type: 'INTERVIEW_UPDATED',
      title: 'Interview rescheduled',
      message: `Your interview for ${interview.application.job.title} was moved to ${data.scheduledAt.toLocaleString(
        'en-IN', { dateStyle: 'medium', timeStyle: 'short' }
      )}`,
      link: '/interviews',
    });
  }

  await audit(actor.id, 'INTERVIEW_UPDATED', 'Interview', interviewId);
  return updated;
}

async function setStatus(actor, companyId, interviewId, status) {
  const { interview } = await getAuthorized(actor, interviewId);
  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: { status },
    include: INTERVIEW_INCLUDE,
  });

  if (status === 'CANCELLED') {
    await notify(interview.application.candidateProfile.userId, {
      type: 'INTERVIEW_CANCELLED',
      title: 'Interview cancelled',
      message: `The ${interview.application.job.title} interview (round ${interview.round}) was cancelled`,
      link: '/interviews',
    });
  }

  await audit(actor.id, `INTERVIEW_${status}`, 'Interview', interviewId);
  return updated;
}

// Feedback: any assigned interviewer or company admin may write it,
// and it is always attributed to the person who actually wrote it.
// One feedback per author per interview (enforced by the DB too).
async function submitFeedback(actor, interviewId, data) {
  const { interview, isCompanyMember, companyRole } = await getAuthorized(actor, interviewId);
  if (!isCompanyMember) throw ApiError.forbidden('Only company members can submit feedback');

  const isAssigned = interview.interviewers.some((i) => i.userId === actor.id);
  const isAdmin = companyRole === 'ADMIN';
  if (!isAssigned && !isAdmin) {
    throw ApiError.forbidden('Only assigned interviewers or a company admin can record feedback');
  }
  if (interview.status === 'CANCELLED') {
    throw ApiError.badRequest('This interview was cancelled');
  }

  const feedback = await prisma.interviewFeedback.upsert({
    where: { interviewId_interviewerId: { interviewId, interviewerId: actor.id } },
    update: data,
    create: { interviewId, interviewerId: actor.id, ...data },
    include: { interviewer: { select: { id: true, fullName: true } } },
  });

  await audit(actor.id, 'INTERVIEW_FEEDBACK_SUBMITTED', 'InterviewFeedback', feedback.id, {
    interviewId,
  });
  return feedback;
}

// Candidate's own interviews (with job + company info, no feedback).
async function listMine(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) return [];
  const interviews = await prisma.interview.findMany({
    where: { application: { candidateProfileId: profile.id } },
    orderBy: { scheduledAt: 'asc' },
    include: INTERVIEW_INCLUDE,
  });
  return interviews.map((i) => shapeForViewer(i, false));
}

// Company interviews.
async function listForCompany(companyId, { when = 'all', page = 1, limit = 20 }) {
  const now = new Date();
  const whenFilter =
    when === 'upcoming'
      ? { scheduledAt: { gte: now }, status: 'SCHEDULED' }
      : when === 'past'
        ? { scheduledAt: { lt: now } }
        : {};

  const where = { application: { job: { companyId } }, ...whenFilter };
  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: INTERVIEW_INCLUDE,
    }),
  ]);
  return { interviews, total, page, limit };
}

module.exports = {
  getAuthorized,
  shapeForViewer,
  schedule,
  update,
  setStatus,
  submitFeedback,
  listMine,
  listForCompany,
  INTERVIEW_INCLUDE,
};
