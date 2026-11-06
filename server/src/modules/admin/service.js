const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { audit } = require('../../utils/audit');
const { pageMeta, ok } = require('../../utils/respond');

// ---------------------------- overview ----------------------------
async function overview() {
  const [totalUsers, totalCandidates, totalRecruiters, totalCompanies, activeCompanies, totalJobs, publishedJobs, totalApplications, recentUsers, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CANDIDATE' } }),
      prisma.user.count({ where: { role: 'RECRUITER' } }),
      prisma.company.count(),
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count(),
      prisma.job.count({ where: { status: 'PUBLISHED' } }),
      prisma.application.count(),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { actor: { select: { fullName: true } } } }),
    ]);

  return {
    totals: {
      totalUsers, totalCandidates, totalRecruiters,
      totalCompanies, activeCompanies,
      totalJobs, publishedJobs, totalApplications,
    },
    recentUsers,
    recentAudit: recentAudit.map((a) => ({ ...a, actorName: a.actor?.fullName || 'System' })),
  };
}

// ---------------------------- users ----------------------------
async function listUsers({ q, role, status, page, limit }) {
  const where = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, fullName: true, email: true, role: true, status: true, createdAt: true,
        memberships: { select: { company: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    users: users.map((u) => ({ ...u, companyName: u.memberships[0]?.company?.name || null, memberships: undefined })),
    meta: pageMeta(total, page, limit),
  };
}

// Suspend / reactivate — suspension blocks login and every authenticated request.
async function setUserStatus(actor, userId, status) {
  if (userId === actor.id) throw ApiError.badRequest('You cannot change your own account status');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'PLATFORM_ADMIN') {
    throw ApiError.forbidden('Platform administrator accounts cannot be suspended');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status, tokenVersion: { increment: 1 } }, // revoke active sessions
    select: { id: true, fullName: true, email: true, role: true, status: true },
  });

  await audit(actor.id, status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', 'User', userId, {
    email: user.email,
  });
  return updated;
}

// ---------------------------- companies ----------------------------
async function listCompanies({ q, status, page, limit }) {
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
  };

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, industry: true, size: true, location: true, status: true, createdAt: true,
        _count: { select: { members: true, jobs: true } },
      },
    }),
  ]);

  return {
    companies: companies.map((c) => ({ ...c, members: c._count.members, jobs: c._count.jobs, _count: undefined })),
    meta: pageMeta(total, page, limit),
  };
}

async function setCompanyStatus(actor, companyId, status) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw ApiError.notFound('Company not found');

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { status },
    select: { id: true, name: true, status: true },
  });

  await audit(actor.id, status === 'SUSPENDED' ? 'COMPANY_SUSPENDED' : 'COMPANY_REACTIVATED', 'Company', companyId, {
    name: company.name,
  });
  return updated;
}

// ---------------------------- audit logs ----------------------------
async function listAuditLogs({ action, entityType, page, limit }) {
  const where = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(entityType ? { entityType } : {}),
  };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
  ]);
  return {
    logs: logs.map((l) => ({ ...l, actorName: l.actor?.fullName || 'System', actor: undefined })),
    meta: pageMeta(total, page, limit),
  };
}

module.exports = { overview, listUsers, setUserStatus, listCompanies, setCompanyStatus, listAuditLogs };
