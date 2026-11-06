const prisma = require('../../lib/prisma');
const { ok } = require('../../utils/respond');

// Company analytics — every number comes from a real database aggregation.
async function companyAnalytics(req, res) {
  const companyId = req.companyId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalJobs,
    activeJobs,
    totalApplications,
    inReview,
    shortlisted,
    interviewsScheduled,
    offered,
    rejected,
    applicationsLast30,
    byStatus,
    perJob,
    daily,
  ] = await Promise.all([
    prisma.job.count({ where: { companyId } }),
    prisma.job.count({ where: { companyId, status: 'PUBLISHED' } }),
    prisma.application.count({ where: { job: { companyId } } }),
    prisma.application.count({ where: { job: { companyId }, status: { in: ['IN_REVIEW', 'SHORTLISTED'] } } }),
    prisma.application.count({ where: { job: { companyId }, status: 'SHORTLISTED' } }),
    prisma.interview.count({ where: { application: { job: { companyId } }, status: 'SCHEDULED' } }),
    prisma.application.count({ where: { job: { companyId }, status: 'OFFERED' } }),
    prisma.application.count({ where: { job: { companyId }, status: 'REJECTED' } }),
    prisma.application.count({ where: { job: { companyId }, appliedAt: { gte: thirtyDaysAgo } } }),
    prisma.application.groupBy({
      by: ['status'],
      where: { job: { companyId } },
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ['jobId'],
      where: { job: { companyId } },
      _count: { _all: true },
      orderBy: { _count: { jobId: 'desc' } },
      take: 5,
    }),
    // 14-day trend of applications per day (PostgreSQL date_trunc)
    prisma.$queryRaw`
      SELECT date_trunc('day', "appliedAt")::date AS day, COUNT(*)::int AS count
      FROM "Application" a
      JOIN "Job" j ON j.id = a."jobId"
      WHERE j."companyId" = ${companyId} AND a."appliedAt" >= NOW() - INTERVAL '14 days'
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  const jobs = await prisma.job.findMany({
    where: { id: { in: perJob.map((p) => p.jobId) } },
    select: { id: true, title: true },
  });
  const jobTitleById = Object.fromEntries(jobs.map((j) => [j.id, j.title]));

  return ok(res, {
    analytics: {
      totals: {
        totalJobs,
        activeJobs,
        totalApplications,
        inReview,
        shortlisted,
        interviewsScheduled,
        offered,
        rejected,
        applicationsLast30,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      topJobs: perJob.map((p) => ({ jobId: p.jobId, title: jobTitleById[p.jobId] || 'Unknown job', count: p._count._all })),
      daily: daily.map((d) => ({ day: d.day, count: d.count })),
    },
  });
}

module.exports = { companyAnalytics };
