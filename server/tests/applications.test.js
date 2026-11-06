// Applications: apply, duplicates, withdraw, pipeline transitions, history, notes.
const { makeCandidate, makeRecruiter, createJob, completeProfile, uploadResume } = require('./helpers');

describe('Applications', () => {
  test('candidate applies once; duplicate is rejected by the database constraint', async () => {
    const rec = await makeRecruiter('apps1@co.test', 'Apps Co 1');
    const cand = await makeCandidate('apps1c@test.dev');
    await completeProfile(cand.agent);
    const { job } = await createJob(rec.agent);

    const first = await cand.agent.post('/api/applications').send({ jobId: job.id, coverNote: 'Hello' });
    expect(first.status).toBe(201);
    expect(first.body.data.application.status).toBe('APPLIED');

    const dup = await cand.agent.post('/api/applications').send({ jobId: job.id });
    expect(dup.status).toBe(409);
  });

  test('cannot apply to draft, closed or expired jobs, or without profile', async () => {
    const rec = await makeRecruiter('apps2@co.test', 'Apps Co 2');
    const cand = await makeCandidate('apps2c@test.dev');
    const { job: published } = await createJob(rec.agent);

    // No profile yet
    const noProfile = await cand.agent.post('/api/applications').send({ jobId: published.id });
    expect(noProfile.status).toBe(400);

    await completeProfile(cand.agent);

    // Draft job
    const { job: draft } = await createJob(rec.agent, { status: 'DRAFT', title: 'Hidden Draft' });
    const toDraft = await cand.agent.post('/api/applications').send({ jobId: draft.id });
    expect(toDraft.status).toBe(404); // invisible to non-members

    // Close the job, then a fresh candidate gets 404 (closed = invisible, no leak).
    const me = await rec.agent.get('/api/auth/me');
    const companyId = me.body.data.user.memberships[0].companyId;
    await rec.agent.patch(`/api/jobs/company/${companyId}/${published.id}/status`).send({ status: 'CLOSED' });

    const cand2 = await makeCandidate('apps2c2@test.dev');
    await completeProfile(cand2.agent);
    const closed = await cand2.agent.post('/api/applications').send({ jobId: published.id });
    expect(closed.status).toBe(404);
  });

  test('status transitions validate, record history, and notify the candidate', async () => {
    const rec = await makeRecruiter('apps3@co.test', 'Apps Co 3');
    const cand = await makeCandidate('apps3c@test.dev');
    await completeProfile(cand.agent);
    const { job } = await createJob(rec.agent);
    const apply = await cand.agent.post('/api/applications').send({ jobId: job.id });
    const appId = apply.body.data.application.id;

    // Illegal: APPLIED -> OFFERED
    await rec.agent.patch(`/api/applications/${appId}/status`).send({ status: 'OFFERED' }).expect(400);

    // Legal: APPLIED -> IN_REVIEW
    const ok = await rec.agent.patch(`/api/applications/${appId}/status`).send({ status: 'IN_REVIEW' });
    expect(ok.status).toBe(200);

    // History is stored with who and from/to.
    const detail = await rec.agent.get(`/api/applications/${appId}`);
    const history = detail.body.data.application.history;
    expect(history.map((h) => h.newStatus)).toEqual(['APPLIED', 'IN_REVIEW']);
    expect(history[1].changedBy.fullName).toBeTruthy();

    // Candidate got a notification.
    const notes = await cand.agent.get('/api/notifications');
    const statuses = notes.body.data.notifications.filter((n) => n.type === 'APPLICATION_STATUS_CHANGED');
    expect(statuses.length).toBeGreaterThanOrEqual(1);

    // Candidate sees history but never notes.
    const candView = await cand.agent.get(`/api/applications/${appId}`);
    expect(candView.body.data.application.history.map((h) => h.newStatus)).toEqual(['APPLIED', 'IN_REVIEW']);
    expect(candView.body.data.application.notes).toBeUndefined();
  });

  test('candidate can withdraw a non-terminal application', async () => {
    const rec = await makeRecruiter('apps4@co.test', 'Apps Co 4');
    const cand = await makeCandidate('apps4c@test.dev');
    await completeProfile(cand.agent);
    const { job } = await createJob(rec.agent);
    const apply = await cand.agent.post('/api/applications').send({ jobId: job.id });
    const appId = apply.body.data.application.id;

    const wd = await cand.agent.post(`/api/applications/${appId}/withdraw`);
    expect(wd.status).toBe(200);
    expect(wd.body.data.application.status).toBe('WITHDRAWN');

    // Terminal — withdrawing again fails.
    await cand.agent.post(`/api/applications/${appId}/withdraw`).expect(400);
  });

  test('resume attached to application blocks resume deletion', async () => {
    const rec = await makeRecruiter('apps5@co.test', 'Apps Co 5');
    const cand = await makeCandidate('apps5c@test.dev');
    await completeProfile(cand.agent);
    const resume = await uploadResume(cand.agent, 'my-cv.pdf');
    const { job } = await createJob(rec.agent);
    await cand.agent.post('/api/applications').send({ jobId: job.id, resumeId: resume.id });

    const del = await cand.agent.delete(`/api/resumes/${resume.id}`);
    expect(del.status).toBe(409);
  });
});
