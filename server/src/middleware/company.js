// Company-level data isolation middleware.
//
// This is the heart of multi-tenant security: every company-scoped route goes
// through requireCompanyMember, which proves the logged-in user is a member of
// the company referenced in the URL (or body) and attaches their company role.
// Anything the user can do afterwards is limited to that company.

const prisma = require('../lib/prisma');
const { ApiError, asyncHandler } = require('../utils/ApiError');

const requireCompanyMember = (resolveCompanyId) =>
  asyncHandler(async (req, _res, next) => {
    const companyId =
      typeof resolveCompanyId === 'function'
        ? resolveCompanyId(req)
        : req.params.companyId || req.body?.companyId || req.validatedParams?.companyId;

    if (!companyId) return next(ApiError.badRequest('Company id is required'));

    const membership = await prisma.companyMember.findUnique({
      where: { userId: req.user.id },
      include: { company: { select: { id: true, name: true, status: true } } },
    });

    if (!membership || membership.companyId !== companyId) {
      // Deliberately 403 (not 404): the caller is authenticated but not
      // authorized for this company's resources.
      return next(ApiError.forbidden('You are not a member of this company'));
    }
    if (membership.company.status === 'SUSPENDED') {
      return next(ApiError.forbidden('This company workspace has been suspended'));
    }

    req.companyId = companyId;
    req.companyRole = membership.role;
    req.company = membership.company;
    next();
  });

// Must run AFTER requireCompanyMember.
const requireCompanyRole = (...roles) => (req, _res, next) => {
  if (!req.companyRole) return next(ApiError.forbidden('Company membership required'));
  if (!roles.includes(req.companyRole)) {
    return next(ApiError.forbidden(`This action requires company role: ${roles.join(' or ')}`));
  }
  next();
};

// For endpoints that implicitly operate on "the caller's own company"
// (recruiter dashboards, application lists, analytics...). Attaches
// req.companyId / req.companyRole from the user's unique membership.
const attachMyCompany = asyncHandler(async (req, _res, next) => {
  const membership = await prisma.companyMember.findUnique({
    where: { userId: req.user.id },
    include: { company: { select: { id: true, name: true, status: true } } },
  });
  if (!membership) return next(ApiError.forbidden('You do not belong to a company workspace yet'));
  if (membership.company.status === 'SUSPENDED') {
    return next(ApiError.forbidden('This company workspace has been suspended'));
  }
  req.companyId = membership.companyId;
  req.companyRole = membership.role;
  req.company = membership.company;
  next();
});

module.exports = { requireCompanyMember, requireCompanyRole, attachMyCompany };
