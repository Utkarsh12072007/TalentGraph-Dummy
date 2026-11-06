// Company data isolation — the most important security property.
const { makeCandidate, makeRecruiter, createJob, completeProfile, uploadResume } = require('./helpers');
const request = require('supertest');

describe('Company data isolation', () => {
  test('recruiter B cannot view, edit, or manage company A resources', async () => {
    const recA = await makeRecruiter('a@co.test', 'Alpha Co');
    const recB = await makeRecruiter('b@co.test', 'Beta Co');
    const { job } = await createJob(recA.agent, { title: 'Alpha job' });

    // A stranger's company id in the path is rejected (403, not 404 — authenticated but not authorized).
    await recA.agent.post(`/api/jobs/company/x-nope`).send({}).expect(403);
    // B cannot edit A's job (companyId in the path must be B's own; mismatch → 403)
    const meB = await recB.agent.get('/api/auth/me');
    const companyB = meB.body.data.user.memberships[0].companyId;
    await recB.agent
      .patch(`/api/jobs/company/${companyB}/${job.id}`)
      .send({ title: 'Hacked title' })
      .expect(403);

    // B cannot change the status of A's job even when they can guess its id.
    await recB.agent
      .patch(`/api/jobs/company/${companyB}/${job.id}/status`)
      .send({ status: 'CLOSED' })
      .expect(403);
  });

  test('company B never sees company A applications, even by id', async () => {
    const recA = await makeRecruiter('a2@co.test', 'Alpha 2');
    const recB = await makeRecruiter('b2@co.test', 'Beta 2');
    const cand = await makeCandidate('iso-cand@test.dev');
    await completeProfile(cand.agent);

    const { job } = await createJob(recA.agent);
    const apply = await cand.agent.post('/api/applications').send({ jobId: job.id });
    expect(apply.status).toBe(201);
    const applicationId = apply.body.data.application.id;

    // B's company list shows only B's (empty) applications.
    const list = await recB.agent.get('/api/applications/company');
    expect(list.body.data.applications).toHaveLength(0);

    // Direct id access is blocked with 403.
    await recB.agent.get(`/api/applications/${applicationId}`).expect(403);
    await recB.agent
      .patch(`/api/applications/${applicationId}/status`)
      .send({ status: 'REJECTED' })
      .expect(403);
    await recB.agent.get(`/api/applications/${applicationId}/notes`).expect(403);

    // Candidate detail is also protected.
    const appDetail = await recA.agent.get(`/api/applications/${applicationId}`);
    const profileId = appDetail.body.data.application.candidateProfile.id;
    await recB.agent.get(`/api/candidates/${profileId}`).expect(403);
  });

  test('resume downloads are authorized: owner yes, unrelated recruiter no', async () => {
    const recA = await makeRecruiter('a3@co.test', 'Alpha 3');
    const recB = await makeRecruiter('b3@co.test', 'Beta 3');
    const cand = await makeCandidate('res-cand@test.dev');
    await completeProfile(cand.agent);
    const resume = await uploadResume(cand.agent);

    // Owner downloads fine.
    await cand.agent.get(`/api/resumes/${resume.id}/download`).expect(200);

    // B has no application from this candidate → forbidden.
    await recB.agent.get(`/api/resumes/${resume.id}/download`).expect(403);

    // After the candidate applies to A, A's recruiters can download.
    const { job } = await createJob(recA.agent);
    await cand.agent.post('/api/applications').send({ jobId: job.id, resumeId: resume.id });
    await recA.agent.get(`/api/resumes/${resume.id}/download`).expect(200);
  });

  test('candidates cannot see recruiter notes or other candidates applications', async () => {
    const rec = await makeRecruiter('a4@co.test', 'Alpha 4');
    const cand1 = await makeCandidate('c1@co.test');
    const cand2 = await makeCandidate('c2@co.test');
    await completeProfile(cand1.agent);
    await completeProfile(cand2.agent);

    const { job } = await createJob(rec.agent);
    const app1 = await cand1.agent.post('/api/applications').send({ jobId: job.id });
    await cand2.agent.post('/api/applications').send({ jobId: job.id });
    const id1 = app1.body.data.application.id;

    await rec.agent.post(`/api/applications/${id1}/notes`).send({ content: 'private note' });

    // Candidate view contains NO notes field at all.
    const view = await cand1.agent.get(`/api/applications/${id1}`);
    expect(view.body.data.application.notes).toBeUndefined();

    // Candidate 2 cannot open candidate 1's application.
    await cand2.agent.get(`/api/applications/${id1}`).expect(403);
  });
});
