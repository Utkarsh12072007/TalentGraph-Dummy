const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { canTransition, JOB_TRANSITIONS } = require('../../utils/transitions');
const { resolveSkills } = require('../../utils/skills');
const { audit } = require('../../utils/audit');

// Job fields joined with company info for cards / details.
const JOB_INCLUDE = {
  company: {
    select: { id: true, name: true, logoUrl: true, industry: true, size: true, location: true },
  },
  skills: { select: { isRequired: true, skill: { select: { name: true } } } },
  _count: { select: { applications: true } },
};

function formatJob(job) {
  const { _count, skills, ...rest } = job;
  return {
    ...rest,
    skills: skills.map((s) => ({ name: s.skill.name, isRequired: s.isRequired })),
    applicationCount: _count.applications,
  };
}

function isExpired(job, now = new Date()) {
  return Boolean(job.deadline && job.deadline < now);
}

// Whose company owns the job + can the viewer act on it.
async function getOwnedJob(jobId, companyId) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: JOB_INCLUDE });
  if (!job) throw ApiError.notFound('Job not found');
  if (job.companyId !== companyId) throw ApiError.forbidden('This job belongs to another company');
  return job;
}

async function create(user, companyId, data) {
  const { skills, status, ...fields } = data;

  const job = await prisma.job.create({
    data: {
      ...fields,
      companyId,
      postedById: user.id,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      skills: {
        create: await Promise.all(
          skills.map(async (s) => {
            const [resolved] = await resolveSkills([s.name]);
            return { skillId: resolved.skillId, isRequired: s.isRequired };
          })
        ),
      },
    },
    include: JOB_INCLUDE,
  });

  await audit(user.id, status === 'PUBLISHED' ? 'JOB_PUBLISHED' : 'JOB_CREATED', 'Job', job.id, {
    title: job.title,
  });
  return formatJob(job);
}

async function update(user, companyId, jobId, data) {
  const existing = await getOwnedJob(jobId, companyId);
  if (existing.status === 'ARCHIVED') {
    throw ApiError.badRequest('Archived jobs cannot be edited');
  }

  const { skills, ...fields } = data;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      ...fields,
      ...(skills
        ? {
            skills: {
              deleteMany: {},
              create: await Promise.all(
                skills.map(async (s) => {
                  const [resolved] = await resolveSkills([s.name]);
                  return { skillId: resolved.skillId, isRequired: s.isRequired };
                })
              ),
            },
          }
        : {}),
    },
    include: JOB_INCLUDE,
  });

  await audit(user.id, 'JOB_UPDATED', 'Job', jobId, { title: job.title });
  return formatJob(job);
}

async function changeStatus(user, companyId, jobId, status) {
  const job = await getOwnedJob(jobId, companyId);
  if (!canTransition(JOB_TRANSITIONS, job.status, status)) {
    throw ApiError.badRequest(`Cannot move a ${job.status.toLowerCase()} job to ${status.toLowerCase()}`);
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? (job.publishedAt ?? new Date()) : job.publishedAt,
    },
    include: JOB_INCLUDE,
  });

  await audit(user.id, `JOB_${status}`, 'Job', jobId, { from: job.status, to: status });
  return formatJob(updated);
}

async function remove(user, companyId, jobId) {
  const job = await getOwnedJob(jobId, companyId);
  if (job.applicationCount > 0) {
    throw ApiError.conflict(
      'This job has applications. Close and archive it instead of deleting it.'
    );
  }
  await prisma.job.delete({ where: { id: jobId } });
  await audit(user.id, 'JOB_DELETED', 'Job', jobId, { title: job.title });
  return { success: true };
}

// Public discovery: only PUBLISHED, non-expired jobs, all filters in SQL.
async function searchPublic(query) {
  const { q, location, workMode, employmentType, experience, salaryMin, sort, page, limit } = query;

  const AND = [
    { status: 'PUBLISHED' },
    { OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
  ];

  if (q) {
    AND.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { skills: { some: { skill: { name: { contains: q, mode: 'insensitive' } } } } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  if (location) {
    AND.push({ location: { contains: location, mode: 'insensitive' } });
  }
  if (workMode) {
    AND.push({ workMode: { in: workMode.split(',') } });
  }
  if (employmentType) {
    AND.push({ employmentType: { in: employmentType.split(',') } });
  }
  if (experience) {
    const bands = {
      ENTRY: { experienceMin: { lte: 1 } },
      MID: { experienceMin: { gte: 2, lte: 3 } },
      SENIOR: { experienceMin: { gte: 4, lte: 6 } },
      LEAD: { experienceMin: { gte: 7 } },
    };
    AND.push(bands[experience]);
  }
  if (salaryMin) {
    AND.push({ OR: [{ salaryMin: { gte: salaryMin } }, { salaryMax: { gte: salaryMin } }] });
  }

  const orderBy =
    sort === 'salary_desc'
      ? [{ salaryMax: { sort: 'desc', nulls: 'last' } }]
      : sort === 'salary_asc'
        ? [{ salaryMin: { sort: 'asc', nulls: 'last' } }]
        : [{ publishedAt: 'desc' }];

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where: { AND } }),
    prisma.job.findMany({
      where: { AND },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: JOB_INCLUDE,
    }),
  ]);

  return { jobs: jobs.map(formatJob), total, page, limit };
}

// Job detail. Rules:
// - Anyone: PUBLISHED and not expired.
// - Company members: any status of their own company (drafts, closed, archived).
// - Signed-in candidates: get a personal "hasApplied" flag.
async function getForViewer(jobId, viewer) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: JOB_INCLUDE });
  if (!job) throw ApiError.notFound('Job not found');

  const ownedByViewerCompany = viewer?.role === 'RECRUITER' && job.companyId === viewer.companyId;

  if (job.status !== 'PUBLISHED' && !ownedByViewerCompany) {
    throw ApiError.notFound('Job not found');
  }

  let hasApplied = false;
  if (viewer?.role === 'CANDIDATE') {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: viewer.id } });
    if (profile) {
      const application = await prisma.application.findUnique({
        where: { jobId_candidateProfileId: { jobId, candidateProfileId: profile.id } },
        select: { id: true },
      });
      hasApplied = Boolean(application);
    }
  }

  return { ...formatJob(job), hasApplied, expired: isExpired(job) };
}

// Company member view of their jobs (all statuses).
async function listCompanyJobs(companyId, { status, q, page, limit }) {
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
  };
  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: JOB_INCLUDE,
    }),
  ]);
  return { jobs: jobs.map(formatJob), total, page, limit };
}

module.exports = {
  formatJob,
  isExpired,
  getOwnedJob,
  create,
  update,
  changeStatus,
  remove,
  searchPublic,
  getForViewer,
  listCompanyJobs,
};
