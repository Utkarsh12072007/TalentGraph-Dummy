// Resumes: upload restrictions, default selection, deletion rules.
const { makeCandidate, makeRecruiter, createJob, completeProfile, fakeResume } = require('./helpers');

describe('Resumes', () => {
  test('uploads pdf/doc/docx and rejects other types', async () => {
    const cand = await makeCandidate('res1c@test.dev');

    const pdf = await cand.agent
      .post('/api/resumes')
      .attach('file', fakeResume(), { filename: 'cv.pdf', contentType: 'application/pdf' });
    expect(pdf.status).toBe(201);
    expect(pdf.body.data.resume.isDefault).toBe(true); // first resume becomes default

    const docx = await cand.agent
      .post('/api/resumes')
      .attach('file', Buffer.from('fake docx'), {
        filename: 'cv.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    expect(docx.status).toBe(201);

    const bad = await cand.agent
      .post('/api/resumes')
      .attach('file', Buffer.from('malware'), { filename: 'evil.exe', contentType: 'application/octet-stream' });
    expect(bad.status).toBe(400);
  });

  test('rejects files over 5 MB', async () => {
    const cand = await makeCandidate('res2c@test.dev');
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0);
    const res = await cand.agent
      .post('/api/resumes')
      .attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  test('only the owner can switch default; owner-only delete when unused', async () => {
    const cand = await makeCandidate('res3c@test.dev');
    const rec = await makeRecruiter('res3r@co.test', 'Res Co 3');
    const r1 = await cand.agent
      .post('/api/resumes')
      .attach('file', fakeResume(), { filename: 'one.pdf', contentType: 'application/pdf' });
    const r2 = await cand.agent
      .post('/api/resumes')
      .attach('file', fakeResume(), { filename: 'two.pdf', contentType: 'application/pdf' });
    const id1 = r1.body.data.resume.id;
    const id2 = r2.body.data.resume.id;

    // Recruiter cannot touch candidate resumes.
    await rec.agent.patch(`/api/resumes/${id1}/default`).expect(403);

    const def = await cand.agent.patch(`/api/resumes/${id2}/default`);
    expect(def.status).toBe(200);

    const list = await cand.agent.get('/api/resumes');
    const defaults = list.body.data.resumes.filter((r) => r.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(id2);

    // Unused resume deletes fine.
    await cand.agent.delete(`/api/resumes/${id1}`).expect(200);
  });
});
