// Development seed data — CLEARLY SEPARATED from production data.
//
// - Never runs in production (guarded below).
// - Uses @demo.dev emails and deletes previous demo data first, so it can be
//   re-run safely. It never touches non-demo accounts.
// - Creates the initial PLATFORM ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
//
// Run: npm run db:seed

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Refusing to seed a production database.');
  process.exit(1);
}

require('dotenv').config({ override: true });
const bcrypt = require('bcryptjs');
const prisma = require('../server/src/lib/prisma');

const DEMO_DOMAIN = '@demo.dev';
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function upsertUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const { password, ...fields } = data; // password is never stored raw
  return prisma.user.upsert({
    where: { email: data.email },
    update: { fullName: fields.fullName, role: fields.role, passwordHash },
    create: { ...fields, passwordHash },
  });
}

// Skills are a shared dictionary — find or create by name.
async function skillId(name) {
  const existing = await prisma.skill.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.skill.create({ data: { name } });
  return created.id;
}

async function main() {
  console.log('[seed] Seeding development data...');

  // ---------- platform admin (from .env, not demo-marked) ----------
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentgraph.local';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[seed] Set ADMIN_PASSWORD in .env first.');
    process.exit(1);
  }
  const admin = await upsertUser({
    email: adminEmail,
    fullName: 'Platform Administrator',
    role: 'PLATFORM_ADMIN',
    password: adminPassword,
  });

  // ---------- clean previous demo data ----------
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  if (demoUsers.length > 0) {
    // Companies created by demo users must go first — deleting them cascades
    // to jobs -> applications -> history/notes/interviews.
    const deletedCompanies = await prisma.company.deleteMany({
      where: { createdById: { in: demoUsers.map((u) => u.id) } },
    });
    for (const user of demoUsers) {
      // Cascades handle profiles, applications, memberships, etc.
      await prisma.user.delete({ where: { id: user.id } });
    }
    console.log(`[seed] Removed ${demoUsers.length} previous demo user(s), ${deletedCompanies.count} demo company(ies)`);
  }

  // ---------- company ----------
  const recruiter = await upsertUser({
    email: 'recruiter' + DEMO_DOMAIN,
    fullName: 'Priya Sharma',
    role: 'RECRUITER',
    password: 'Recruiter@1',
  });
  const teammate = await upsertUser({
    email: 'interviewer' + DEMO_DOMAIN,
    fullName: 'Arjun Mehta',
    role: 'RECRUITER',
    password: 'Interviewer@1',
  });

  const company = await prisma.company.create({
    data: {
      name: 'Aurora Labs (Demo)',
      description:
        'Aurora Labs is a product engineering company building data infrastructure tools for mid-market fintechs. Demo workspace created by the seed script.',
      website: 'https://auroralabs.example.com',
      industry: 'Software / Data Infrastructure',
      size: '51-200',
      location: 'Bengaluru, India',
      createdById: recruiter.id,
    },
  });
  await prisma.companyMember.createMany({
    data: [
      { companyId: company.id, userId: recruiter.id, role: 'ADMIN' },
      { companyId: company.id, userId: teammate.id, role: 'INTERVIEWER' },
    ],
  });

  // ---------- candidate ----------
  const candidate = await upsertUser({
    email: 'candidate' + DEMO_DOMAIN,
    fullName: 'Rahul Verma',
    role: 'CANDIDATE',
    password: 'Candidate@1',
  });
  const candidate2 = await upsertUser({
    email: 'candidate2' + DEMO_DOMAIN,
    fullName: 'Sneha Iyer',
    role: 'CANDIDATE',
    password: 'Candidate@1',
  });

  const profile = await prisma.candidateProfile.create({
    data: {
      userId: candidate.id,
      headline: 'Full-stack developer (React / Node.js)',
      summary:
        'Final-year CS student with two internship cycles building web applications in React and Node.js. Comfortable with PostgreSQL, REST APIs and Git-based teamwork. Looking for a full-time frontend-leaning full-stack role.',
      location: 'Pune, India',
      yearsExperience: 1,
      skills: {
        create: [
          { skillId: await skillId('JavaScript'), level: 'ADVANCED' },
          { skillId: await skillId('React'), level: 'ADVANCED' },
          { skillId: await skillId('Node.js'), level: 'INTERMEDIATE' },
          { skillId: await skillId('PostgreSQL'), level: 'INTERMEDIATE' },
          { skillId: await skillId('Git'), level: 'ADVANCED' },
        ],
      },
      educations: {
        create: [
          {
            institution: 'College of Engineering, Pune',
            degree: 'B.Tech',
            field: 'Computer Science',
            startDate: daysAgo(1000),
            endDate: daysAhead(200),
            grade: '8.6 CGPA',
          },
        ],
      },
      experiences: {
        create: [
          {
            company: 'Wavelet Softworks',
            title: 'Software Engineering Intern',
            employmentType: 'INTERNSHIP',
            startDate: daysAgo(400),
            endDate: daysAgo(180),
            description:
              'Built internal admin tooling in React, added REST endpoints in an Express service, wrote Jest tests for billing logic.',
          },
        ],
      },
      projects: {
        create: [
          {
            name: 'CampusCarpool',
            description: 'Ride-sharing web app for students with JWT auth and real-time seat updates.',
            techStack: 'React, Node.js, PostgreSQL, Socket.IO',
            link: 'https://github.com/rahulverma/campuscarpool',
          },
        ],
      },
      certifications: {
        create: [
          { name: 'AWS Cloud Practitioner', issuer: 'Amazon Web Services', issueDate: daysAgo(300) },
        ],
      },
    },
  });

  const profile2 = await prisma.candidateProfile.create({
    data: {
      userId: candidate2.id,
      headline: 'Backend developer (Python, FastAPI)',
      summary: 'Backend-focused developer with an interest in data-intensive services and clean API design.',
      location: 'Chennai, India',
      yearsExperience: 2,
      skills: {
        create: [
          { skillId: await skillId('Python'), level: 'ADVANCED' },
          { skillId: await skillId('FastAPI'), level: 'INTERMEDIATE' },
        ],
      },
    },
  });

  // ---------- jobs ----------
  const jobDefs = [
    {
      title: 'Frontend Engineer (React)',
      description:
        'You will build customer-facing interfaces in React and TypeScript-adjacent JavaScript, work with designers to ship accessible components, and help us keep a fast, reliable frontend. You will join a six-person product team and own features end to end.',
      responsibilities:
        '- Build and maintain React features\n- Review code and mentor juniors\n- Improve accessibility and performance\n- Collaborate with design on component APIs',
      requirements:
        '- 2+ years with React\n- Solid JavaScript fundamentals\n- Experience with REST APIs\n- Care for UI details',
      location: 'Bengaluru, India',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceMin: 2,
      experienceMax: 5,
      salaryMin: 1200000,
      salaryMax: 1800000,
      currency: 'INR',
      status: 'PUBLISHED',
      skills: [
        { name: 'React', isRequired: true },
        { name: 'JavaScript', isRequired: true },
        { name: 'CSS', isRequired: false },
      ],
      deadline: daysAhead(21),
      publishedAt: daysAgo(5),
    },
    {
      title: 'Backend Engineer (Node.js / PostgreSQL)',
      description:
        'Design and operate the services behind our data platform: Express-based APIs, PostgreSQL schemas, queues and observability. You will work closely with product engineers and own services from design to production.',
      responsibilities:
        '- Design REST APIs and schemas\n- Improve query performance\n- Write integration tests\n- Participate in on-call rotation',
      requirements: '- 3+ years backend Node.js\n- Strong SQL skills\n- Testing discipline\n- Docker basics',
      location: 'Remote (India)',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      experienceMin: 3,
      experienceMax: 7,
      salaryMin: 1600000,
      salaryMax: 2400000,
      currency: 'INR',
      status: 'PUBLISHED',
      skills: [
        { name: 'Node.js', isRequired: true },
        { name: 'PostgreSQL', isRequired: true },
        { name: 'Docker', isRequired: false },
      ],
      deadline: daysAhead(30),
      publishedAt: daysAgo(2),
    },
    {
      title: 'Engineering Intern (Summer)',
      description:
        'A 12-week internship for students who enjoy building web products. You will pair with a mentor and ship a real feature to production by the end of the internship.',
      responsibilities: '- Ship a scoped feature with mentor support\n- Write tests\n- Join team rituals',
      requirements: '- Currently enrolled in a CS degree\n- JavaScript basics\n- Curiosity',
      location: 'Bengaluru, India',
      workMode: 'ON_SITE',
      employmentType: 'INTERNSHIP',
      experienceMin: 0,
      salaryMin: 50000,
      salaryMax: 60000,
      currency: 'INR',
      status: 'PUBLISHED',
      skills: [{ name: 'JavaScript', isRequired: true }],
      deadline: daysAhead(45),
      publishedAt: daysAgo(1),
    },
    {
      title: 'Engineering Manager — Data Platform',
      description: 'Draft role: lead a team of five building the next version of our ingestion platform. Saved as a draft to show the draft workflow.',
      responsibilities: '- Lead the team\n- Hiring\n- Architecture reviews',
      requirements: '- 5+ years engineering\n- 1+ year leading',
      location: 'Bengaluru, India',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceMin: 5,
      experienceMax: 10,
      status: 'DRAFT',
      skills: [{ name: 'Leadership', isRequired: true }],
    },
  ];

  const jobs = [];
  for (const def of jobDefs) {
    const { skills, ...fields } = def;
    const job = await prisma.job.create({
      data: {
        ...fields,
        companyId: company.id,
        postedById: recruiter.id,
        skills: {
          create: await Promise.all(
            skills.map(async (s) => ({ skillId: await skillId(s.name), isRequired: s.isRequired }))
          ),
        },
      },
    });
    jobs.push(job);
  }

  // ---------- applications in different pipeline stages ----------
  const applications = [];

  applications.push(
    await prisma.application.create({
      data: {
        jobId: jobs[0].id, // Frontend Engineer
        candidateProfileId: profile.id,
        status: 'IN_REVIEW',
        appliedAt: daysAgo(4),
        coverNote: 'I have shipped two React projects end to end and would love to join the frontend team.',
        history: {
          create: [
            { previousStatus: null, newStatus: 'APPLIED', changedById: candidate.id, createdAt: daysAgo(4) },
            { previousStatus: 'APPLIED', newStatus: 'IN_REVIEW', changedById: recruiter.id, createdAt: daysAgo(3) },
          ],
        },
      },
    })
  );

  applications.push(
    await prisma.application.create({
      data: {
        jobId: jobs[2].id, // Internship
        candidateProfileId: profile.id,
        status: 'INTERVIEW',
        appliedAt: daysAgo(8),
        history: {
          create: [
            { previousStatus: null, newStatus: 'APPLIED', changedById: candidate.id, createdAt: daysAgo(8) },
            { previousStatus: 'APPLIED', newStatus: 'SHORTLISTED', changedById: recruiter.id, createdAt: daysAgo(6) },
            { previousStatus: 'SHORTLISTED', newStatus: 'INTERVIEW', changedById: recruiter.id, createdAt: daysAgo(5) },
          ],
        },
      },
    })
  );

  const internshipInterview = await prisma.interview.create({
    data: {
      applicationId: applications[1].id,
      round: 1,
      scheduledAt: daysAhead(2),
      durationMinutes: 45,
      type: 'VIDEO',
      locationOrLink: 'https://meet.example.com/aurora-interview',
      createdById: recruiter.id,
      interviewers: { create: [{ userId: teammate.id }] },
    },
  });

  applications.push(
    await prisma.application.create({
      data: {
        jobId: jobs[1].id, // Backend Engineer
        candidateProfileId: profile2.id,
        status: 'APPLIED',
        appliedAt: daysAgo(1),
        history: {
          create: [{ previousStatus: null, newStatus: 'APPLIED', changedById: candidate2.id, createdAt: daysAgo(1) }],
        },
      },
    })
  );

  applications.push(
    await prisma.application.create({
      data: {
        jobId: jobs[2].id, // Internship
        candidateProfileId: profile2.id,
        status: 'REJECTED',
        appliedAt: daysAgo(20),
        history: {
          create: [
            { previousStatus: null, newStatus: 'APPLIED', changedById: candidate2.id, createdAt: daysAgo(20) },
            { previousStatus: 'APPLIED', newStatus: 'REJECTED', changedById: recruiter.id, createdAt: daysAgo(18) },
          ],
        },
      },
    })
  );

  // Private recruiter note (never visible to candidates)
  await prisma.recruiterNote.create({
    data: {
      applicationId: applications[0].id,
      authorId: recruiter.id,
      content: 'Strong React portfolio. Check depth of state management experience before shortlisting.',
    },
  });

  // Interview feedback (visible to company members only)
  await prisma.interviewFeedback.create({
    data: {
      interviewId: internshipInterview.id,
      interviewerId: teammate.id,
      rating: 4,
      recommendation: 'HIRE',
      strengths: 'Clear communication, solid JS basics',
      improvements: 'More CSS layout practice',
    },
  });

  // Notification for the candidate
  await prisma.notification.createMany({
    data: [
      {
        userId: candidate.id,
        type: 'APPLICATION_STATUS_CHANGED',
        title: 'Application status updated',
        message: 'Your application for Frontend Engineer (React) moved to IN REVIEW',
        link: '/applications',
      },
      {
        userId: candidate.id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview scheduled',
        message: 'Round 1 VIDEO for Engineering Intern (Summer)',
        link: '/interviews',
      },
      {
        userId: recruiter.id,
        type: 'APPLICATION_RECEIVED',
        title: 'New application received',
        message: 'Sneha Iyer applied for Backend Engineer (Node.js / PostgreSQL)',
        link: '/recruiter/applications',
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SEED_PERFORMED',
      entityType: 'System',
      metadata: { note: 'Development seed executed' },
    },
  });

  console.log(`
[seed] Done. Demo accounts (development only):

  Platform admin : ${adminEmail}  /  ${adminPassword}
  Recruiter      : recruiter@demo.dev   /  Recruiter@1
  Interviewer    : interviewer@demo.dev /  Interviewer@1
  Candidate      : candidate@demo.dev   /  Candidate@1
  Candidate 2    : candidate2@demo.dev  /  Candidate@1

[seed] Demo data: 1 company, ${jobs.length} jobs (${jobs.filter((j) => j.status === 'PUBLISHED').length} published), ${applications.length} applications, 1 interview.
`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
