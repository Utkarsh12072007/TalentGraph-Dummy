// Development seed data — CLEARLY SEPARATED from production data.
//
// - Production runs require explicit ALLOW_DEMO_SEED=1.
// - Uses deterministic upserts; it never deletes records.
// - Creates demo accounts plus the configured platform admin.
//
// Run: npm run db:seed

// Load local development config without overriding environment variables.
// This lets a deploy command target a remote DATABASE_URL safely while still
// using .env defaults for local development.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
// Production databases are protected by default. Deliberate seeding is still
// possible (e.g. creating the first admin on a fresh deployment) by setting
// ALLOW_DEMO_SEED=1 — the seed only touches its named demo accounts and the
// configured platform admin.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
  console.error('[seed] Refusing to seed a production database.');
  console.error('[seed] To seed a fresh deployment anyway (demo accounts + admin), run with ALLOW_DEMO_SEED=1.');
  process.exit(1);
}

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
  return (await prisma.skill.upsert({ where: { name }, update: {}, create: { name } })).id;
}

// Company has no composite unique constraint on (name, createdById), so use a
// lookup followed by update/create instead of an invalid Prisma compound key.
async function upsertCompany(data) {
  const existing = await prisma.company.findFirst({
    where: { name: data.name, createdById: data.createdById },
  });
  return existing
    ? prisma.company.update({ where: { id: existing.id }, data })
    : prisma.company.create({ data });
}

async function ensureDemoResume(profile) {
  const directory = path.join(__dirname, '..', 'server', 'uploads', 'resumes');
  const storedName = `talentgraph-demo-${profile.id}.pdf`;
  const filePath = path.join(directory, storedName);
  fs.mkdirSync(directory, { recursive: true });
  const lines = [
    'Rahul Verma', 'Software Engineer | React, Node.js, PostgreSQL',
    'Pune, India | rahul.verma@example.com',
    'SUMMARY', 'Early-career engineer with internship experience building dependable web products.',
    'EXPERIENCE', 'Software Engineering Intern - Wavelet Softworks',
    'Built React admin tooling and REST endpoints; improved test coverage for billing workflows.',
    'EDUCATION', 'B.Tech, Computer Science - College of Engineering, Pune',
    'SKILLS', 'JavaScript, React, Node.js, PostgreSQL, Git',
  ];
  const escapePdf = (text) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 17 Tf 72 740 Td (${escapePdf(lines[0])}) Tj /F1 10 Tf 0 -28 Td (${escapePdf(lines[1])}) Tj 0 -18 Td (${escapePdf(lines[2])}) Tj 0 -34 Td (${escapePdf(lines[3])}) Tj 0 -18 Td (${escapePdf(lines[4])}) Tj 0 -34 Td (${escapePdf(lines[5])}) Tj 0 -18 Td (${escapePdf(lines[6])}) Tj 0 -18 Td (${escapePdf(lines[7])}) Tj 0 -34 Td (${escapePdf(lines[8])}) Tj 0 -18 Td (${escapePdf(lines[9])}) Tj 0 -34 Td (${escapePdf(lines[10])}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fs.writeFileSync(filePath, pdf);

  const existing = await prisma.resume.findFirst({
    where: { candidateProfileId: profile.id, originalName: 'Rahul-Verma-Software-Engineer.pdf' },
  });
  const defaultResume = existing?.isDefault || !(await prisma.resume.findFirst({ where: { candidateProfileId: profile.id, isDefault: true } }));
  const data = { storedName, mimeType: 'application/pdf', sizeBytes: Buffer.byteLength(pdf), isDefault: defaultResume };
  return existing
    ? prisma.resume.update({ where: { id: existing.id }, data })
    : prisma.resume.create({ data: { ...data, candidateProfileId: profile.id, originalName: 'Rahul-Verma-Software-Engineer.pdf' } });
}

async function main() {
  console.log('[seed] Seeding development data...');

  const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const demoRecruiterPassword = process.env.DEMO_RECRUITER_PASSWORD;
  const demoCandidatePassword = process.env.DEMO_CANDIDATE_PASSWORD;
  if (!demoAdminPassword || !demoRecruiterPassword || !demoCandidatePassword) {
    throw new Error('Set DEMO_ADMIN_PASSWORD, DEMO_RECRUITER_PASSWORD, and DEMO_CANDIDATE_PASSWORD before seeding.');
  }

  // ---------- platform admin (from .env, not demo-marked) ----------
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentgraph.local';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[seed] Set ADMIN_PASSWORD in .env first.');
    process.exit(1);
  }
  await upsertUser({
    email: adminEmail,
    fullName: 'Platform Administrator',
    role: 'PLATFORM_ADMIN',
    password: adminPassword,
  });
  const admin = await upsertUser({
    email: 'admin@talentgraph.demo',
    fullName: 'TalentGraph Demo Administrator',
    role: 'PLATFORM_ADMIN',
    password: demoAdminPassword,
  });

  // ---------- company ----------
  const recruiter = await upsertUser({
    email: 'recruiter@talentgraph.demo',
    fullName: 'Priya Sharma',
    role: 'RECRUITER',
    password: demoRecruiterPassword,
  });
  const teammate = await upsertUser({
    email: 'interviewer' + DEMO_DOMAIN,
    fullName: 'Arjun Mehta',
    role: 'RECRUITER',
    password: demoRecruiterPassword,
  });
  const companyRecruiters = [recruiter];
  for (let i = 1; i < 10; i += 1) {
    companyRecruiters.push(await upsertUser({
      email: `recruiter${i + 1}${DEMO_DOMAIN}`,
      fullName: ['Meera Nair', 'Kabir Singh', 'Ananya Rao', 'Dev Patel'][i % 4],
      role: 'RECRUITER',
      password: demoRecruiterPassword,
    }));
  }

  const company = await upsertCompany({
      name: 'Aurora Labs (Demo)',
      description:
        'Aurora Labs is a product engineering company building data infrastructure tools for mid-market fintechs. Demo workspace created by the seed script.',
      website: 'https://auroralabs.example.com',
      industry: 'Software / Data Infrastructure',
      size: '51-200',
      location: 'Bengaluru, India',
      createdById: recruiter.id,
  });
  await prisma.companyMember.upsert({ where: { userId: recruiter.id }, update: { companyId: company.id, role: 'ADMIN' }, create: { companyId: company.id, userId: recruiter.id, role: 'ADMIN' } });
  await prisma.companyMember.upsert({ where: { userId: teammate.id }, update: { companyId: company.id, role: 'INTERVIEWER' }, create: { companyId: company.id, userId: teammate.id, role: 'INTERVIEWER' } });

  // ---------- candidate ----------
  const candidate = await upsertUser({
    email: 'candidate@talentgraph.demo',
    fullName: 'Rahul Verma',
    role: 'CANDIDATE',
    password: demoCandidatePassword,
  });
  const candidate2 = await upsertUser({
    email: 'candidate2' + DEMO_DOMAIN,
    fullName: 'Sneha Iyer',
    role: 'CANDIDATE',
    password: demoCandidatePassword,
  });

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: candidate.id },
    update: {
      headline: 'Full-stack developer (React / Node.js)',
      summary: 'Early-career engineer with internship experience building dependable web products in React and Node.js. Enjoys working across APIs, PostgreSQL data models, and accessible interfaces.',
      location: 'Pune, India', yearsExperience: 1,
    },
    create: {
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
  const demoResume = await ensureDemoResume(profile);

  const profile2 = await prisma.candidateProfile.upsert({
    where: { userId: candidate2.id },
    update: { headline: 'Backend developer (Python, FastAPI)', summary: 'Backend-focused developer with two years of experience building data-intensive services and well-documented APIs.', location: 'Chennai, India', yearsExperience: 2 },
    create: {
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

  // The candidate dashboard uses the account's own profile. Additional
  // deterministic candidates populate recruiter applicant lists and admin totals.
  const candidateUsers = [candidate, candidate2];
  const candidateProfiles = [profile, profile2];
  const candidateNames = [
    'Aarav Kulkarni', 'Ishita Bose', 'Rohan Menon', 'Kavya Reddy', 'Aditya Joshi',
    'Nisha Kapoor', 'Vikram Shah', 'Anika Das', 'Siddharth Rao', 'Tara Iyer',
    'Neel Banerjee', 'Maya Nair', 'Karan Malhotra', 'Diya Sethi', 'Arjun Pillai',
    'Riya Chawla', 'Manav Bhat', 'Sana Qureshi', 'Kabir Anand', 'Pooja Krishnan',
    'Devika Sen', 'Reyansh Gupta', 'Mira Thomas',
  ];
  const cities = ['Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi NCR'];
  for (let i = 0; i < candidateNames.length; i += 1) {
    const user = await upsertUser({
      email: `candidate${String(i + 3).padStart(2, '0')}@talentgraph.demo`,
      fullName: candidateNames[i], role: 'CANDIDATE', password: demoCandidatePassword,
    });
    const candidateProfile = await prisma.candidateProfile.upsert({
      where: { userId: user.id }, update: {},
      create: {
        userId: user.id,
        headline: ['Software Engineer', 'Frontend Developer', 'Data Analyst', 'Backend Engineer'][i % 4],
        summary: `Software professional with ${i % 5 + 1} years of experience building customer-focused products. Brings a thoughtful approach to code quality, collaboration, and learning from user feedback.`,
        location: `${cities[i % cities.length]}, India`, yearsExperience: i % 5 + 1,
        skills: { create: await Promise.all(['JavaScript', 'React', 'Python', 'SQL'].slice(i % 2, i % 2 + 3).map(async (name) => ({ skillId: await skillId(name), level: 'INTERMEDIATE' }))) },
        educations: { create: [{ institution: ['Pune Institute of Computer Technology', 'Vellore Institute of Technology', 'University of Mumbai'][i % 3], degree: 'B.Tech', field: 'Computer Science', startDate: daysAgo(2200), endDate: daysAgo(700), grade: `${7 + (i % 3) / 10} CGPA` }] },
        experiences: { create: [{ company: ['Riverstone Digital', 'Orbit Systems', 'Juniper Product Co.'][i % 3], title: ['Software Engineer', 'Frontend Engineer', 'Data Analyst'][i % 3], employmentType: 'FULL_TIME', location: `${cities[i % cities.length]}, India`, startDate: daysAgo(600 + i * 30), description: 'Delivered product improvements with engineering and design partners, supported releases, and improved reliability through testing and documentation.' }] },
        projects: { create: [{ name: ['OpenLedger', 'Clinic Connect', 'LocalCart'][i % 3], description: 'A practical web product built to make a common customer workflow easier to complete.', techStack: 'React, Node.js, PostgreSQL', link: `https://github.com/${user.fullName.toLowerCase().replace(/\s+/g, '')}/portfolio` }] },
      },
    });
    candidateUsers.push(user);
    candidateProfiles.push(candidateProfile);
  }

  // ---------- companies and realistic job catalogue ----------
  const companyDefs = [
    { name: 'Aurora Labs (Demo)', industry: 'Software / Data Infrastructure', size: '51-200', location: 'Bengaluru, India', description: 'Builds dependable data infrastructure and analytics products for growing fintech teams.' },
    { name: 'Cedar Health Systems (Demo)', industry: 'Health Technology', size: '201-500', location: 'Pune, India', description: 'A digital health company improving access to care through secure patient and clinician tools.' },
    { name: 'Monsoon Commerce (Demo)', industry: 'E-commerce', size: '51-200', location: 'Mumbai, India', description: 'Helps independent retailers manage storefronts, fulfilment and customer relationships.' },
    { name: 'Northstar Mobility (Demo)', industry: 'Mobility', size: '201-500', location: 'Hyderabad, India', description: 'Develops fleet software and routing technology for cleaner urban transport.' },
    { name: 'Lattice Financial (Demo)', industry: 'Financial Services', size: '501-1000', location: 'Bengaluru, India', description: 'Makes modern payments and credit infrastructure for businesses across India.' },
    { name: 'Paper Kite Studio (Demo)', industry: 'Product Design', size: '11-50', location: 'Remote, India', description: 'An independent product studio partnering with teams to design and ship useful software.' },
    { name: 'TerraCompute (Demo)', industry: 'Cloud Computing', size: '51-200', location: 'Chennai, India', description: 'Builds developer tooling for efficient, observable cloud workloads.' },
    { name: 'SignalWorks (Demo)', industry: 'Cybersecurity', size: '51-200', location: 'Remote, India', description: 'Protects cloud-first organisations with practical threat detection and response tools.' },
    { name: 'BlueOak Analytics (Demo)', industry: 'Data & Analytics', size: '11-50', location: 'Delhi NCR, India', description: 'Turns complex operational data into clear decisions for customer-focused businesses.' },
    { name: 'Common Ground Learning (Demo)', industry: 'Education Technology', size: '51-200', location: 'Jaipur, India', description: 'Creates accessible learning products for students and educators.' },
  ];
  const companies = [];
  for (let i = 0; i < companyDefs.length; i += 1) {
    const def = companyDefs[i];
    const owner = companyRecruiters[i];
    const saved = await upsertCompany({
      ...def,
      website: `https://${def.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/demo$/, '')}.example.com`,
      logoUrl: `https://placehold.co/96x96/EEF2FF/4338CA?text=${encodeURIComponent(def.name.split(' ')[0].slice(0, 2))}`,
      createdById: owner.id,
    });
    companies.push(saved);
    await prisma.companyMember.upsert({ where: { userId: owner.id }, update: { companyId: saved.id }, create: { companyId: saved.id, userId: owner.id, role: 'ADMIN' } });
  }
  const roles = [
    ['Software Engineer', 'JavaScript, TypeScript, Node.js, PostgreSQL', 'Build reliable product features across service boundaries; work with design and product to shape small releases, review code, and improve observability.', 'A degree or equivalent practical experience; solid programming fundamentals, testing habits, and 1–3 years building production software.'],
    ['Frontend Developer', 'React, JavaScript, CSS, Accessibility', 'Create responsive, accessible interfaces for customers and internal teams. Partner with product design, maintain shared components, and investigate performance regressions.', 'Hands-on React and modern JavaScript experience, familiarity with browser debugging, and an eye for interaction details.'],
    ['Backend Developer', 'Python, FastAPI, PostgreSQL, Docker', 'Design APIs and data models for services that handle customer and operational workflows. Improve query performance and help the team operate services confidently.', 'Experience developing backend services, practical SQL knowledge, and an understanding of API security and automated testing.'],
    ['Full Stack Developer', 'React, Node.js, PostgreSQL, REST APIs', 'Take product work from schema and API design through a polished user interface. Coordinate delivery with a compact cross-functional team.', 'Experience shipping web applications with a modern frontend framework and backend services; comfortable reading and improving existing code.'],
    ['AI/ML Engineer', 'Python, PyTorch, Machine Learning, SQL', 'Develop and evaluate machine-learning features using real product data. Build repeatable training and inference workflows with clear monitoring and responsible evaluation.', 'Strong Python and statistics foundations; experience with model evaluation, data preparation, and communicating limitations to product teams.'],
    ['Data Analyst', 'SQL, Python, Tableau, Statistics', 'Answer product and operations questions with well-defined metrics, thoughtful analysis, and concise dashboards. Improve data quality with partner teams.', 'Strong SQL, care with data definitions, and experience presenting analysis to non-technical stakeholders.'],
    ['Data Scientist', 'Python, SQL, scikit-learn, Experimentation', 'Frame ambiguous product questions as measurable analyses and experiments. Build interpretable models and communicate what the evidence can and cannot tell us.', 'Experience with statistical methods, Python data tools, and sound experimental design.'],
    ['DevOps Engineer', 'AWS, Kubernetes, Terraform, CI/CD', 'Improve deployment workflows, service reliability, and infrastructure visibility. Work with engineers on pragmatic automation and incident follow-up.', 'Experience operating cloud infrastructure and containerized services; scripting, monitoring, and incident response fundamentals.'],
    ['Product Manager', 'Product Strategy, Analytics, Roadmapping, SQL', 'Set a clear direction for a customer-facing product area. Gather user insight, define measurable outcomes, and help a cross-functional team deliver focused improvements.', 'Experience delivering software products, strong written communication, and comfort using data and customer feedback to make trade-offs.'],
    ['UI/UX Designer', 'Figma, Prototyping, User Research, Accessibility', 'Research customer needs and turn them into clear flows, prototypes, and implementation-ready interface guidance. Help maintain a consistent design system.', 'A portfolio showing shipped digital products, user-centered design methods, and close collaboration with engineers.'],
    ['QA Engineer', 'Playwright, API Testing, JavaScript, CI/CD', 'Build a useful quality strategy across browser and API workflows. Work with engineers to catch regressions early and make releases more predictable.', 'Experience with test automation, exploratory testing, and clear bug reports; comfort working in an iterative delivery team.'],
    ['Cybersecurity Engineer', 'Cloud Security, SIEM, Python, Incident Response', 'Strengthen cloud security controls, triage detection signals, and help service owners resolve findings. Improve practical runbooks and security automation.', 'Experience with cloud security concepts, threat analysis, and scripting; familiarity with incident handling and security reviews.'],
  ];
  const openings = [];
  const levels = [
    { label: 'Intern', min: 0, max: 1, type: 'INTERNSHIP', mode: 'ON_SITE', salary: [30000, 55000] },
    { label: 'Associate', min: 0, max: 2, type: 'FULL_TIME', mode: 'HYBRID', salary: [700000, 1100000] },
    { label: '', min: 2, max: 5, type: 'FULL_TIME', mode: 'REMOTE', salary: [1400000, 2200000] },
    { label: 'Senior', min: 5, max: 8, type: 'FULL_TIME', mode: 'HYBRID', salary: [2400000, 3600000] },
  ];
  const companyNames = companyDefs.map((c) => c.name);
  for (let i = 0; i < 48; i += 1) {
    const [role, skillText, description, requirements] = roles[i % roles.length];
    const level = levels[i < 12 ? i % levels.length : Math.floor(i / roles.length) % levels.length];
    const co = i < 12 ? companies[0] : companies[i % companies.length];
    const loc = companyNames[i % companyNames.length].includes('Remote') ? 'Remote, India' : co.location;
    const skillNames = skillText.split(', ');
    const title = `${level.label ? `${level.label} ` : ''}${role}${i % 3 === 0 ? ` — ${['Platform', 'Product', 'Growth', 'Infrastructure'][Math.floor(i / 3) % 4]}` : ''}`;
    const fields = {
      title, description: `${description} At ${co.name.replace(' (Demo)', '')}, you will have room to make decisions, learn from experienced teammates, and see how your work helps customers across India.`,
      responsibilities: `- Own scoped work from discovery through release\n- Collaborate with engineering, design, and product partners\n- Document decisions and share progress with the team\n- Use customer feedback and production signals to improve outcomes`,
      requirements, location: loc, workMode: level.mode, employmentType: level.type,
      experienceMin: level.min, experienceMax: level.max,
      salaryMin: level.salary[0], salaryMax: level.salary[1], currency: 'INR',
      status: i === 10 || i === 11 ? 'CLOSED' : i === 8 || i === 9 ? 'DRAFT' : 'PUBLISHED',
      deadline: daysAhead(20 + (i % 35)),
      publishedAt: i === 8 || i === 9 ? null : daysAgo((i % 14) + 1),
    };
    const existing = await prisma.job.findFirst({ where: { companyId: co.id, title } });
    const job = existing
      ? await prisma.job.update({ where: { id: existing.id }, data: fields })
      : await prisma.job.create({ data: { ...fields, companyId: co.id, postedById: companyRecruiters[companies.indexOf(co)].id } });
    if (existing) await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
    await prisma.jobSkill.createMany({ data: await Promise.all(skillNames.map(async (name, index) => ({ jobId: job.id, skillId: await skillId(name), isRequired: index < 3 }))), skipDuplicates: true });
    openings.push(job);
  }
  const jobs = openings;

  // ---------- applications, histories, interviews and activity ----------
  const applications = [];
  const demoCandidateJobs = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13];
  const candidateStatuses = ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'OFFERED', 'IN_REVIEW', 'APPLIED', 'INTERVIEW', 'OFFERED'];
  const applicationPlans = demoCandidateJobs.map((jobIndex, index) => ({
    profileRecord: candidateProfiles[0], candidateUser: candidateUsers[0], job: openings[jobIndex], status: candidateStatuses[index], age: index + 2,
  }));
  for (let i = 1; i < candidateProfiles.length; i += 1) {
    applicationPlans.push({
      profileRecord: candidateProfiles[i], candidateUser: candidateUsers[i],
      job: openings[((i - 1) * 3) % 8],
      status: ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'OFFERED'][(i - 1) % 6],
      age: (i % 25) + 1,
    });
  }
  for (const plan of applicationPlans) {
    const { profileRecord, candidateUser, job, status, age } = plan;
    const appliedAt = daysAgo(age);
    const app = await prisma.application.upsert({
      where: { jobId_candidateProfileId: { jobId: job.id, candidateProfileId: profileRecord.id } },
      update: { status, appliedAt, ...(profileRecord.id === profile.id ? { resumeId: demoResume.id } : {}) },
      create: {
        jobId: job.id, candidateProfileId: profileRecord.id, status, appliedAt,
        ...(profileRecord.id === profile.id ? { resumeId: demoResume.id } : {}),
        coverNote: `I am interested in the ${job.title} role and bring relevant project experience in ${profileRecord.id === profile.id ? 'React and product delivery' : 'software engineering and customer-focused products'}. I would welcome the opportunity to discuss how I can contribute.`,
      },
    });
    applications.push(app);
    const oldHistory = await prisma.applicationStatusHistory.count({ where: { applicationId: app.id } });
    if (oldHistory === 0) {
      await prisma.applicationStatusHistory.create({ data: { applicationId: app.id, previousStatus: null, newStatus: 'APPLIED', changedById: candidateUser.id, createdAt: appliedAt } });
      if (status !== 'APPLIED') {
        await prisma.applicationStatusHistory.create({ data: { applicationId: app.id, previousStatus: 'APPLIED', newStatus: status, changedById: recruiter.id, createdAt: daysAgo(Math.max(0, age - 2)) } });
      }
    }
  }

  const interviewApps = applications.filter((app) => app.status === 'INTERVIEW');
  const completedInterviewApp = interviewApps[0];
  const scheduledInterviewApp = interviewApps[1] || interviewApps[0];
  const completedInterview = completedInterviewApp ? await prisma.interview.upsert({
    where: { id: `demo-completed-${completedInterviewApp.id}` },
    update: {},
    create: { id: `demo-completed-${completedInterviewApp.id}`, applicationId: completedInterviewApp.id, round: 1, scheduledAt: daysAgo(3), durationMinutes: 45, type: 'VIDEO', locationOrLink: 'https://meet.example.com/technical-discussion', status: 'COMPLETED', createdById: recruiter.id, interviewers: { create: [{ userId: teammate.id }] }, feedbacks: { create: [{ interviewerId: teammate.id, rating: 4, recommendation: 'HIRE', strengths: 'Structured problem solving and clear communication', improvements: 'Could add more detail on monitoring choices', comments: 'Good match for a collaborative product team.' }] } },
  }) : null;
  const scheduledInterview = scheduledInterviewApp ? await prisma.interview.upsert({
    where: { id: `demo-upcoming-${scheduledInterviewApp.id}` },
    update: {},
    create: { id: `demo-upcoming-${scheduledInterviewApp.id}`, applicationId: scheduledInterviewApp.id, round: 2, scheduledAt: daysAhead(3), durationMinutes: 60, type: 'VIDEO', locationOrLink: 'https://meet.example.com/product-interview', createdById: recruiter.id, interviewers: { create: [{ userId: teammate.id }] } },
  }) : null;

  for (const application of applications.slice(0, 8)) {
    await prisma.recruiterNote.upsert({
      where: { id: `demo-note-${application.id}` }, update: {},
      create: { id: `demo-note-${application.id}`, applicationId: application.id, authorId: recruiter.id, content: 'Review the candidate portfolio against the role requirements and agree on next steps with the hiring team.' },
    });
  }

  for (let i = 0; i < 2; i += 1) {
    const target = candidateUsers[i];
    const messages = [
      { type: 'APPLICATION_STATUS_CHANGED', title: 'Your application is in review', message: 'The hiring team has started reviewing your application.' },
      { type: 'INTERVIEW_SCHEDULED', title: 'Interview invitation', message: 'A recruiter scheduled a conversation about one of your applications.' },
      { type: 'APPLICATION_RECEIVED', title: 'Application received', message: 'Your application was sent to the hiring team.' },
    ];
    for (let j = 0; j < messages.length; j += 1) {
      const id = `demo-notification-${target.id}-${j}`;
      await prisma.notification.upsert({ where: { id }, update: {}, create: { id, userId: target.id, ...messages[j], link: j === 1 ? '/interviews' : '/applications', isRead: j === 2, createdAt: daysAgo(j + 1) } });
    }
  }
  await prisma.notification.upsert({
    where: { id: `demo-recruiter-notification-${recruiter.id}` }, update: {},
    create: { id: `demo-recruiter-notification-${recruiter.id}`, userId: recruiter.id, type: 'APPLICATION_RECEIVED', title: 'New candidates in your pipeline', message: `${applications.length} sample applications are available across your open roles.`, link: '/recruiter/applications' },
  });

  await prisma.auditLog.upsert({
    where: { id: 'talentgraph-demo-seed-activity' },
    update: { metadata: { note: 'Demo account seed executed', jobs: openings.length, applications: applications.length } },
    create: {
      id: 'talentgraph-demo-seed-activity',
      actorId: admin.id,
      action: 'SEED_PERFORMED',
      entityType: 'System',
      metadata: { note: 'Demo account seed executed', jobs: openings.length, applications: applications.length },
    },
  });

  console.log(`[seed] Done. ${candidateUsers.length} candidate accounts, ${companyRecruiters.length} recruiter accounts, 2 platform admin accounts; ${companies.length} companies, ${jobs.length} seeded jobs (${jobs.filter((j) => j.status === 'PUBLISHED').length} published), ${applications.length} applications, ${[completedInterview, scheduledInterview].filter(Boolean).length} interviews.`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
