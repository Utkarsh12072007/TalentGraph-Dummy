// Job lifecycle: drafts, publishing, public search filters, transitions.
const { makeRecruiter, createJob } = require('./helpers');

describe('Jobs', () => {
  test('draft jobs are invisible publicly; publishing makes them visible', async () => {
    const rec = await makeRecruiter('jobs1@co.test', 'Jobs Co 1');

    const { job } = await createJob(rec.agent, { status: 'DRAFT', title: 'Secret Draft Role' });
    expect(job.status).toBe('DRAFT');

    // Not in public search
    const search = await rec.agent.get('/api/jobs?q=Secret Draft');
    expect(search.body.data.jobs).toHaveLength(0);
    // Detail is 404 for anonymous visitors
    const detail = await rec.agent.get(`/api/jobs/${job.id}`).expect(200); // member sees own draft
    expect(detail.body.data.job.status).toBe('DRAFT');

    // Publish via legal transition
    const me = await rec.agent.get('/api/auth/me');
    const companyId = me.body.data.user.memberships[0].companyId;
    await rec.agent
      .patch(`/api/jobs/company/${companyId}/${job.id}/status`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const anon = await rec.agent.get('/api/jobs?q=Secret Draft');
    expect(anon.body.data.jobs).toHaveLength(1);
  });

  test('illegal job transitions are rejected', async () => {
    const rec = await makeRecruiter('jobs2@co.test', 'Jobs Co 2');
    const me = await rec.agent.get('/api/auth/me');
    const companyId = me.body.data.user.memberships[0].companyId;

    const { job } = await createJob(rec.agent, { status: 'DRAFT' });
    // DRAFT -> CLOSED is illegal
    await rec.agent
      .patch(`/api/jobs/company/${companyId}/${job.id}/status`)
      .send({ status: 'CLOSED' })
      .expect(400);
    // DRAFT -> PUBLISHED is legal, then CLOSED -> ARCHIVED works
    await rec.agent.patch(`/api/jobs/company/${companyId}/${job.id}/status`).send({ status: 'PUBLISHED' }).expect(200);
    await rec.agent.patch(`/api/jobs/company/${companyId}/${job.id}/status`).send({ status: 'CLOSED' }).expect(200);
    await rec.agent.patch(`/api/jobs/company/${companyId}/${job.id}/status`).send({ status: 'ARCHIVED' }).expect(200);
    // ARCHIVED is terminal
    await rec.agent
      .patch(`/api/jobs/company/${companyId}/${job.id}/status`)
      .send({ status: 'PUBLISHED' })
      .expect(400);
  });

  test('public search filters by work mode and excludes expired deadlines', async () => {
    const rec = await makeRecruiter('jobs3@co.test', 'Jobs Co 3');
    await createJob(rec.agent, { title: 'Remote Platform Engineer', workMode: 'REMOTE' });
    await createJob(rec.agent, { title: 'On-site Platform Engineer', workMode: 'ON_SITE' });
    await createJob(rec.agent, {
      title: 'Expired Engineer Role',
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    const remote = await rec.agent.get('/api/jobs?q=Platform Engineer&workMode=REMOTE');
    expect(remote.body.data.jobs).toHaveLength(1);
    expect(remote.body.data.jobs[0].workMode).toBe('REMOTE');

    const all = await rec.agent.get('/api/jobs?q=Engineer');
    const titles = all.body.data.jobs.map((j) => j.title);
    expect(titles).not.toContain('Expired Engineer Role');
  });

  test('job validation: short description and bad salary range fail', async () => {
    const rec = await makeRecruiter('jobs4@co.test', 'Jobs Co 4');
    const me = await rec.agent.get('/api/auth/me');
    const companyId = me.body.data.user.memberships[0].companyId;

    const short = await rec.agent.post(`/api/jobs/company/${companyId}`).send({
      title: 'X', description: 'too short', workMode: 'REMOTE', employmentType: 'FULL_TIME',
    });
    expect(short.status).toBe(400);

    const badSalary = await rec.agent.post(`/api/jobs/company/${companyId}`).send({
      title: 'Valid title here',
      description: 'A description that is definitely longer than thirty characters.',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      salaryMin: 100,
      salaryMax: 50,
    });
    expect(badSalary.status).toBe(400);
  });

// Regression coverage: partial job updates must not be able to create an
// invalid salary/experience range — neither inside the payload nor by
// combining the patch with the stored values.
describe('Job update range validation', () => {
  test('rejects invalid salary ranges in the payload and against stored values', async () => {
    const rec = await makeRecruiter('rng-rec@co.test', 'Range Co');
    const { job, companyId } = await createJob(rec.agent, { salaryMin: 500000, salaryMax: 900000 });
    const url = `/api/jobs/company/${companyId}/${job.id}`;

    // Both fields in one payload, max < min.
    await rec.agent
      .patch(url)
      .send({ salaryMin: 800000, salaryMax: 300000 })
      .expect(400);

    // Patch only salaryMax below the STORED salaryMin — caught by the
    // merged-values check in the service, invisible to the payload schema.
    await rec.agent
      .patch(url)
      .send({ salaryMax: 100000 })
      .expect(400);

    // Stored row is untouched by the rejected updates.
    const detail = await rec.agent.get(`/api/jobs/${job.id}`);
    expect(detail.body.data.job.salaryMin).toBe(500000);
    expect(detail.body.data.job.salaryMax).toBe(900000);

    // A valid patch still works.
    await rec.agent
      .patch(url)
      .send({ salaryMax: 1200000 })
      .expect(200);
  });

  test('rejects invalid experience ranges merged from patch + stored values', async () => {
    const rec = await makeRecruiter('rng-rec2@co.test', 'Range Co 2');
    const { job, companyId } = await createJob(rec.agent, { experienceMin: 3, experienceMax: 6 });

    await rec.agent
      .patch(`/api/jobs/company/${companyId}/${job.id}`)
      .send({ experienceMin: 8 })
      .expect(400);
  });
});
});
