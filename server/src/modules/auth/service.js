const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  tokenVersion: true, // embedded in the JWT at sign time
  createdAt: true,
};

async function register(input) {
  const { role, fullName, email, password, companyName, companyIndustry } = input;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  // Platform admins are never created through public registration.
  // See scripts/seed.js (or a future CLI bootstrap) for the admin creation flow.
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role,
      ...(role === 'CANDIDATE'
        ? { candidateProfile: { create: {} } }
        : {}),
    },
    select: PUBLIC_USER_FIELDS,
  });

  // A recruiter may create their company workspace right away and
  // automatically becomes its administrator.
  if (role === 'RECRUITER' && companyName) {
    const company = await prisma.company.create({
      data: { name: companyName, industry: companyIndustry || null, createdById: user.id },
    });
    await prisma.companyMember.create({
      data: { companyId: company.id, userId: user.id, role: 'ADMIN' },
    });
  }

  return user;
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw ApiError.unauthorized('Invalid email or password');

  if (user.status === 'SUSPENDED') {
    throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
  }

  const companyMembership = await prisma.companyMember.findUnique({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, status: true } } },
  });

  return { user: user, companyMembership };
}

// Logout = increment tokenVersion -> every previously issued JWT for this
// user becomes invalid immediately (session revocation).
async function logout(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

// GET /api/auth/me — everything the client needs to render the right app shell.
async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PUBLIC_USER_FIELDS,
      // Headline + summary drive the client's "profile complete" warnings,
      // so both are needed on the session payload.
      candidateProfile: { select: { id: true, headline: true, summary: true } },
      memberships: {
        include: {
          company: {
            select: { id: true, name: true, logoUrl: true, status: true, industry: true, size: true, location: true, description: true, website: true },
          },
        },
      },
    },
  });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user;
}

module.exports = { register, login, logout, me, PUBLIC_USER_FIELDS };
