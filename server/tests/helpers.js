// Shared helpers for the test suite.
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

// Register + login a user, returning the agent (cookie jar) and user data.
async function registerAndLogin({ role, fullName, email, password, companyName }) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ role, fullName, email, password, ...(companyName ? { companyName } : {}) });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { agent: res, user: res.body.data.user };
}

function agentFrom(res) {
  const agent = request.agent(app);
  // supertest stores set-cookie on the response; attach it to a new agent.
  const cookies = res.headers['set-cookie'];
  for (const cookie of cookies) agent.set('Cookie', cookie.split(';')[0]);
  return agent;
}

async function makeCandidate(email = 'cand@test.dev') {
  const { agent, user } = await registerAndLogin({
    role: 'CANDIDATE', fullName: 'Test Candidate', email, password: 'Password@1',
  });
  return { agent: agentFrom(agent), user };
}

async function makeRecruiter(email = 'rec@test.dev', companyName = 'Test Co') {
  const { agent, user } = await registerAndLogin({
    role: 'RECRUITER', fullName: 'Test Recruiter', email, password: 'Password@1',
    ...(companyName ? { companyName } : {}),
  });
  return { agent: agentFrom(agent), user };
}

// Create + publish a job for the recruiter's own company.
async function createJob(agent, overrides = {}) {
  // Find own company id first.
  const me = await agent.get('/api/auth/me');
  const companyId = me.body.data.user.memberships[0].companyId;
  const res = await agent.post(`/api/jobs/company/${companyId}`).send({
    title: 'Backend Engineer',
    description: 'A role for building reliable APIs with Node.js and PostgreSQL in a product team.',
    workMode: 'REMOTE',
    employmentType: 'FULL_TIME',
    experienceMin: 1,
    experienceMax: 5,
    salaryMin: 1000000,
    salaryMax: 1500000,
    currency: 'INR',
    status: 'PUBLISHED',
    skills: [{ name: 'Node.js', isRequired: true }],
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`createJob failed: ${JSON.stringify(res.body)}`);
  return { job: res.body.data.job, companyId };
}

// Complete the candidate profile so applications are allowed.
async function completeProfile(agent, overrides = {}) {
  const res = await agent.patch('/api/candidates/me/profile').send({
    headline: 'Full-stack developer',
    summary: 'I build web applications with React and Node.js and love clean APIs.',
    ...overrides,
  });
  if (res.status !== 200) throw new Error(`profile failed: ${JSON.stringify(res.body)}`);
  return res.body.data.profile;
}

function fakeResume(filename = 'resume.pdf') {
  // Minimal buffer that satisfies the PDF mime filter.
  return Buffer.from('%PDF-1.4 fake resume content for tests');
}

async function uploadResume(agent, filename = 'resume.pdf') {
  const res = await agent
    .post('/api/resumes')
    .attach('file', fakeResume(), { filename, contentType: 'application/pdf' });
  if (res.status !== 201) throw new Error(`resume upload failed: ${JSON.stringify(res.body)}`);
  return res.body.data.resume;
}

module.exports = {
  app,
  registerAndLogin,
  agentFrom,
  makeCandidate,
  makeRecruiter,
  createJob,
  completeProfile,
  uploadResume,
  fakeResume,
};
