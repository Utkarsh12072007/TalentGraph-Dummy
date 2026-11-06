// OpenAPI 3.0 description of the TalentGraph API.
// Browse it at /api/docs (Swagger UI) — every documented endpoint is real.

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'TalentGraph API',
    version: '1.0.0',
    description:
      'Recruitment management platform API. Authentication uses a JWT delivered in an HTTP-only cookie (tg_token). Company-scoped endpoints verify membership server-side.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Auth' }, { name: 'Users' }, { name: 'Companies' }, { name: 'Candidates' },
    { name: 'Jobs' }, { name: 'Applications' }, { name: 'Resumes' }, { name: 'Interviews' },
    { name: 'Notifications' }, { name: 'Analytics' }, { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'tg_token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'FORBIDDEN' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          role: { type: 'string', enum: ['CANDIDATE', 'RECRUITER', 'PLATFORM_ADMIN'] },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          workMode: { type: 'string', enum: ['ON_SITE', 'REMOTE', 'HYBRID'] },
          employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] },
          salaryMin: { type: 'integer', nullable: true },
          salaryMax: { type: 'integer', nullable: true },
          currency: { type: 'string' },
          deadline: { type: 'string', format: 'date-time', nullable: true },
          skills: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, isRequired: { type: 'boolean' } } } },
        },
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'] },
          appliedAt: { type: 'string', format: 'date-time' },
          coverNote: { type: 'string', nullable: true },
        },
      },
      Interview: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          round: { type: 'integer' },
          scheduledAt: { type: 'string', format: 'date-time' },
          type: { type: 'string', enum: ['PHONE', 'VIDEO', 'ON_SITE'] },
          status: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'] },
        },
      },
    },
  },
  paths: {
    '/api/health': { get: { tags: ['Auth'], summary: 'Health check', responses: { 200: { description: 'OK' } } } },

    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register as candidate or recruiter',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role', 'fullName', 'email', 'password'], properties: {
          role: { type: 'string', enum: ['CANDIDATE', 'RECRUITER'] },
          fullName: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', format: 'password' },
          companyName: { type: 'string', description: 'Creates a company workspace; the creator becomes ADMIN' },
          companyIndustry: { type: 'string' },
        } } } } },
        responses: { 201: { description: 'Registered (auth cookie set)' }, 409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
      },
    },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Log in', responses: { 200: { description: 'OK (auth cookie set)' }, 401: { description: 'Invalid credentials' }, 403: { description: 'Account suspended' } } } },
    '/api/auth/logout': { post: { tags: ['Auth'], summary: 'Log out (revokes all sessions via tokenVersion)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user with profile / membership context', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 401: { description: 'Not signed in' } } } },

    '/api/users/me': { patch: { tags: ['Users'], summary: 'Update own account name', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/users/me/password': { post: { tags: ['Users'], summary: 'Change password (revokes other sessions)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 400: { description: 'Current password incorrect' } } } },

    '/api/companies': { post: { tags: ['Companies'], summary: 'Create company workspace (become ADMIN)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' }, 409: { description: 'Already in a company' } } } },
    '/api/companies/mine': { get: { tags: ['Companies'], summary: 'Own membership and company', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/companies/{companyId}/public': { get: { tags: ['Companies'], summary: 'Public company profile', responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } } },
    '/api/companies/{companyId}': {
      get: { tags: ['Companies'], summary: 'Company profile (members only)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Not a member' } } },
      patch: { tags: ['Companies'], summary: 'Update company (ADMIN, multipart logo allowed)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Requires company ADMIN' } } },
    },
    '/api/companies/{companyId}/members': {
      get: { tags: ['Companies'], summary: 'List members (ADMIN)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Companies'], summary: 'Add an existing registered recruiter by email (ADMIN)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Added' }, 404: { description: 'User not found' }, 409: { description: 'Already member / belongs to another company' } } },
    },
    '/api/companies/{companyId}/members/{memberId}': {
      patch: { tags: ['Companies'], summary: 'Change member role (ADMIN)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Companies'], summary: 'Remove member (ADMIN)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } },
    },

    '/api/candidates/me/profile': { get: { tags: ['Candidates'], summary: 'Own full profile', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } }, patch: { tags: ['Candidates'], summary: 'Update basic profile', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/candidates/me/profile/educations': { post: { tags: ['Candidates'], summary: 'Add education', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/candidates/me/profile/experiences': { post: { tags: ['Candidates'], summary: 'Add experience', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/candidates/me/profile/skills': { post: { tags: ['Candidates'], summary: 'Add skill', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' }, 409: { description: 'Duplicate skill' } } } },
    '/api/candidates/me/profile/projects': { post: { tags: ['Candidates'], summary: 'Add project', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/candidates/me/profile/certifications': { post: { tags: ['Candidates'], summary: 'Add certification', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/candidates/{profileId}': { get: { tags: ['Candidates'], summary: 'Candidate profile for a company that received their application', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Candidate never applied to your company' } } } },

    '/api/jobs': { get: { tags: ['Jobs'], summary: 'Public job search (published, non-expired only)', parameters: [
      { name: 'q', in: 'query', schema: { type: 'string' } },
      { name: 'location', in: 'query', schema: { type: 'string' } },
      { name: 'workMode', in: 'query', schema: { type: 'string', example: 'REMOTE,HYBRID' } },
      { name: 'employmentType', in: 'query', schema: { type: 'string', example: 'FULL_TIME,INTERNSHIP' } },
      { name: 'experience', in: 'query', schema: { type: 'string', enum: ['ENTRY', 'MID', 'SENIOR', 'LEAD'] } },
      { name: 'salaryMin', in: 'query', schema: { type: 'integer' } },
      { name: 'sort', in: 'query', schema: { type: 'string', enum: ['recent', 'salary_desc', 'salary_asc'] } },
      { name: 'page', in: 'query', schema: { type: 'integer' } },
    ], responses: { 200: { description: 'OK' } } } },
    '/api/jobs/{jobId}': { get: { tags: ['Jobs'], summary: 'Job detail (public when published; members see own drafts)', responses: { 200: { description: 'OK' }, 404: { description: 'Not found or not visible' } } } },
    '/api/jobs/company/{companyId}': { get: { tags: ['Jobs'], summary: 'List company jobs (all statuses)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } }, post: { tags: ['Jobs'], summary: 'Create job (DRAFT or PUBLISHED)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } } } },
    '/api/jobs/company/{companyId}/{jobId}': {
      patch: { tags: ['Jobs'], summary: 'Update job', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Other company\'s job' } } },
      delete: { tags: ['Jobs'], summary: 'Delete draft job without applications (otherwise archive)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 409: { description: 'Has applications — close/archive instead' } } },
    },
    '/api/jobs/company/{companyId}/{jobId}/status': { patch: { tags: ['Jobs'], summary: 'Change job status (DRAFT→PUBLISHED→CLOSED→ARCHIVED transitions enforced)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 400: { description: 'Illegal transition' } } } },

    '/api/applications': { post: { tags: ['Applications'], summary: 'Apply to a job (duplicate = 409 from DB constraint)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Applied' }, 400: { description: 'Job closed/expired or profile incomplete' }, 409: { description: 'Already applied' } } } },
    '/api/applications/mine': { get: { tags: ['Applications'], summary: 'Own applications with status history and interviews', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/applications/company': { get: { tags: ['Applications'], summary: 'Company applications (filters: status, jobId, q, page)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/applications/{applicationId}': { get: { tags: ['Applications'], summary: 'Application detail (candidate: no notes; company member: full view)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Not your application / other company' } } } },
    '/api/applications/{applicationId}/status': { patch: { tags: ['Applications'], summary: 'Change status (validates transition, writes history, notifies candidate)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 400: { description: 'Illegal transition' } } } },
    '/api/applications/{applicationId}/withdraw': { post: { tags: ['Applications'], summary: 'Withdraw own application', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/applications/{applicationId}/notes': {
      get: { tags: ['Applications'], summary: 'Private recruiter notes (company only, never sent to candidates)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Applications'], summary: 'Add private note', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Created' } } },
    },

    '/api/resumes': {
      get: { tags: ['Resumes'], summary: 'Own resumes', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Resumes'], summary: 'Upload resume (pdf/doc/docx, max 5MB)', security: [{ cookieAuth: [] }], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Uploaded' }, 400: { description: 'Bad file type/size' } } },
    },
    '/api/resumes/{resumeId}/download': { get: { tags: ['Resumes'], summary: 'Download (owner, or recruiter of a company the candidate applied to)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'File stream' }, 403: { description: 'Not authorized' } } } },
    '/api/resumes/{resumeId}/default': { patch: { tags: ['Resumes'], summary: 'Set default resume', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/resumes/{resumeId}': { delete: { tags: ['Resumes'], summary: 'Delete resume (blocked while attached to applications)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 409: { description: 'Attached to applications' } } } },

    '/api/interviews': { post: { tags: ['Interviews'], summary: 'Schedule interview (assign company-member interviewers)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Scheduled' } } } },
    '/api/interviews/mine': { get: { tags: ['Interviews'], summary: 'Own interviews (candidate)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/interviews/company': { get: { tags: ['Interviews'], summary: 'Company interviews (when=upcoming|past|all)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/interviews/{interviewId}': { get: { tags: ['Interviews'], summary: 'Interview detail (candidate never receives feedback)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/interviews/{interviewId}/feedback': { post: { tags: ['Interviews'], summary: 'Submit feedback (assigned interviewer or company ADMIN)', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Saved' }, 403: { description: 'Not an assigned interviewer' } } } },
    '/api/interviews/{interviewId}/cancel': { post: { tags: ['Interviews'], summary: 'Cancel interview', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },

    '/api/notifications': { get: { tags: ['Notifications'], summary: 'Own notifications + unreadCount', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/notifications/read': { post: { tags: ['Notifications'], summary: 'Mark read (ids[] or all=true)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },

    '/api/analytics/company': { get: { tags: ['Analytics'], summary: 'Company recruitment analytics (real aggregates)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },

    '/api/admin/overview': { get: { tags: ['Admin'], summary: 'Platform statistics (PLATFORM_ADMIN only)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' }, 403: { description: 'Requires platform admin' } } } },
    '/api/admin/users': { get: { tags: ['Admin'], summary: 'Search platform users', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/admin/users/{userId}/suspend': { post: { tags: ['Admin'], summary: 'Suspend user (blocks login + revokes sessions, audit-logged)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/admin/companies': { get: { tags: ['Admin'], summary: 'List companies', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/admin/companies/{companyId}/suspend': { post: { tags: ['Admin'], summary: 'Suspend company workspace', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
    '/api/admin/audit-logs': { get: { tags: ['Admin'], summary: 'Audit log (filter by action/entity)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'OK' } } } },
  },
};
