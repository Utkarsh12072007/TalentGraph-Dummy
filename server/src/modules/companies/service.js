const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');
const { audit } = require('../../utils/audit');
const { logoPath, removeFileIfExists } = require('../../utils/storage');

// Public company fields — safe to show to anyone (used on public job pages).
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  description: true,
  website: true,
  industry: true,
  size: true,
  location: true,
  logoUrl: true,
  createdAt: true,
};

// A recruiter can only own one company workspace (see schema decision).
async function getMembership(userId) {
  return prisma.companyMember.findUnique({
    where: { userId },
    include: { company: true },
  });
}

async function create(user, data) {
  if (user.role !== 'RECRUITER') {
    throw ApiError.forbidden('Only recruiter accounts can create a company workspace');
  }
  const existing = await getMembership(user.id);
  if (existing) throw ApiError.conflict('You already belong to a company workspace');

  const company = await prisma.company.create({
    data: {
      name: data.name,
      website: data.website || null,
      industry: data.industry || null,
      size: data.size || null,
      location: data.location || null,
      description: data.description || null,
      createdById: user.id,
    },
  });

  // The creator becomes the company administrator.
  await prisma.companyMember.create({
    data: { companyId: company.id, userId: user.id, role: 'ADMIN' },
  });

  await audit(user.id, 'COMPANY_CREATED', 'Company', company.id, { name: company.name });
  return company;
}

async function getPublicProfile(companyId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, status: 'ACTIVE' },
    select: {
      ...PUBLIC_FIELDS,
      _count: { select: { jobs: { where: { status: 'PUBLISHED' } } } },
    },
  });
  if (!company) throw ApiError.notFound('Company not found');
  const { _count, ...rest } = company;
  return { ...rest, openJobs: _count.jobs };
}

async function getCompanyProfile(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { jobs: true, members: true } } },
  });
  if (!company) throw ApiError.notFound('Company not found');
  const { _count, ...rest } = company;
  return { ...rest, totalJobs: _count.jobs, totalMembers: _count.members };
}

async function update(user, companyId, data, logoFile) {
  const current = await prisma.company.findUnique({ where: { id: companyId } });
  if (!current) throw ApiError.notFound('Company not found');

  let logoUrl;
  if (logoFile) {
    if (current.logoUrl) removeFileIfExists(logoPath(current.logoUrl.replace('/uploads/logos/', '')));
    logoUrl = `/uploads/logos/${logoFile.filename}`;
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.website !== undefined ? { website: data.website || null } : {}),
      ...(data.industry !== undefined ? { industry: data.industry || null } : {}),
      ...(data.size !== undefined ? { size: data.size || null } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await audit(user.id, 'COMPANY_UPDATED', 'Company', companyId);
  return updated;
}

async function listMembers(companyId) {
  return prisma.companyMember.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, status: true } },
    },
  });
}

// Membership process: a company admin adds an ALREADY REGISTERED recruiter
// by email (no email invitations — no email provider is configured).
async function addMember(actor, companyId, { email, role }) {
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw ApiError.notFound('No registered user found with this email');
  if (target.role !== 'RECRUITER') {
    throw ApiError.badRequest('Only registered recruiter accounts can join a company');
  }
  if (target.status === 'SUSPENDED') throw ApiError.badRequest('This user account is suspended');

  const existing = await prisma.companyMember.findUnique({ where: { userId: target.id } });
  if (existing) {
    throw ApiError.conflict(
      existing.companyId === companyId
        ? 'This user is already a member of your company'
        : 'This user already belongs to another company'
    );
  }

  const member = await prisma.companyMember.create({
    data: { companyId, userId: target.id, role },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  await audit(actor.id, 'MEMBER_ADDED', 'CompanyMember', member.id, { email, role });
  return member;
}

async function updateMember(actor, companyId, memberId, { role }) {
  const member = await prisma.companyMember.findFirst({
    where: { id: memberId, companyId },
  });
  if (!member) throw ApiError.notFound('Member not found in this company');

  const updated = await prisma.companyMember.update({
    where: { id: memberId },
    data: { role },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  await audit(actor.id, 'MEMBER_ROLE_CHANGED', 'CompanyMember', memberId, { role });
  return updated;
}

async function removeMember(actor, companyId, memberId) {
  const member = await prisma.companyMember.findFirst({
    where: { id: memberId, companyId },
  });
  if (!member) throw ApiError.notFound('Member not found in this company');
  if (member.userId === actor.id) {
    throw ApiError.badRequest('You cannot remove yourself from the company');
  }

  await prisma.companyMember.delete({ where: { id: memberId } });
  await audit(actor.id, 'MEMBER_REMOVED', 'CompanyMember', memberId);
  return { success: true };
}

module.exports = {
  PUBLIC_FIELDS,
  getMembership,
  create,
  getPublicProfile,
  getCompanyProfile,
  update,
  listMembers,
  addMember,
  updateMember,
  removeMember,
};
