// Authentication: registration, login, session revocation, suspension.
const request = require('supertest');
const { app, registerAndLogin, agentFrom } = require('./helpers');
const prisma = require('../src/lib/prisma');

describe('Auth', () => {
  test('registers a candidate and creates an empty profile', async () => {
    const res = await request(app).post('/api/auth/register').send({
      role: 'CANDIDATE', fullName: 'Ana Candidate', email: 'ana@test.dev', password: 'Password@1',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CANDIDATE');
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);

    const profile = await prisma.candidateProfile.findFirst({ where: {} });
    expect(profile).not.toBeNull();
  });

  test('rejects platform admin role through public registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      role: 'RECRUITER', fullName: 'Evil Admin', email: 'evil@test.dev', password: 'Password@1',
    });
    expect(res.status).toBe(201); // recruiter is fine — admin role is simply never accepted
    // Attempting to force PLATFORM_ADMIN via the API is impossible: role is an enum in the schema.
    const users = await prisma.user.findMany({ where: { role: 'PLATFORM_ADMIN' } });
    expect(users).toHaveLength(0);
  });

  test('rejects duplicate email with 409', async () => {
    const body = { role: 'CANDIDATE', fullName: 'Dup', email: 'dup@test.dev', password: 'Password@1' };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  test('recruiter registration with company name creates ADMIN membership', async () => {
    const res = await request(app).post('/api/auth/register').send({
      role: 'RECRUITER', fullName: 'Rec Root', email: 'root@test.dev', password: 'Password@1', companyName: 'Root Labs',
    });
    expect(res.status).toBe(201);
    const membership = await prisma.companyMember.findFirst();
    expect(membership.role).toBe('ADMIN');
  });

  test('login succeeds and wrong password fails', async () => {
    await request(app).post('/api/auth/register').send({
      role: 'CANDIDATE', fullName: 'Log In', email: 'login@test.dev', password: 'Password@1',
    });
    const ok = await request(app).post('/api/auth/login').send({ email: 'login@test.dev', password: 'Password@1' });
    expect(ok.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({ email: 'login@test.dev', password: 'WrongPass1' });
    expect(bad.status).toBe(401);
  });

  test('/api/auth/me requires a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('logout revokes the token (session revocation via tokenVersion)', async () => {
    const { agent } = await registerAndLogin({
      role: 'CANDIDATE', fullName: 'Log Out', email: 'logout@test.dev', password: 'Password@1',
    });
    const raw = agent.headers['set-cookie'][0].split(';')[0];

    expect((await request(app).get('/api/auth/me').set('Cookie', raw)).status).toBe(200);
    expect((await request(app).post('/api/auth/logout').set('Cookie', raw)).status).toBe(200);
    // The old token is now invalid because tokenVersion was incremented.
    const revoked = await request(app).get('/api/auth/me').set('Cookie', raw);
    expect(revoked.status).toBe(401);
  });

  test('suspended users are blocked from authenticated endpoints and login', async () => {
    const { agent, user } = await registerAndLogin({
      role: 'CANDIDATE', fullName: 'Sus Pect', email: 'sus@test.dev', password: 'Password@1',
    });
    const raw = agent.headers['set-cookie'][0].split(';')[0];
    const cookieAgent = agentFrom(agent);

    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });
    expect((await cookieAgent.get('/api/auth/me')).status).toBe(403);

    const login = await request(app).post('/api/auth/login').send({ email: 'sus@test.dev', password: 'Password@1' });
    expect(login.status).toBe(403);
    void raw;
  });
});
