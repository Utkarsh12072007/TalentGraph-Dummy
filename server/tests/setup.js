// Per-worker test setup.
// - Points the app at the TEST database BEFORE any app code is imported.
// - Truncates every table between tests so tests are independent.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://talentgraph@127.0.0.1:5432/talentgraph_test';
process.env.PORT = '4100';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLES = [
  '"AuditLog"', '"Notification"', '"InterviewFeedback"', '"Interviewer"', '"Interview"',
  '"RecruiterNote"', '"ApplicationStatusHistory"', '"Application"', '"JobSkill"', '"Job"',
  '"Resume"', '"Certification"', '"Project"', '"Experience"', '"Education"',
  '"CandidateSkill"', '"Skill"', '"CandidateProfile"', '"CompanyMember"', '"Company"', '"User"',
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(', ')} CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
