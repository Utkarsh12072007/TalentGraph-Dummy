const fs = require('fs');
const resumesService = require('./service');
const { ok, created } = require('../../utils/respond');

async function listMine(req, res) {
  return ok(res, { resumes: await resumesService.listMine(req.user.id) });
}

async function upload(req, res) {
  return created(res, { resume: await resumesService.upload(req.user.id, req.file) });
}

async function setDefault(req, res) {
  return ok(res, await resumesService.setDefault(req.user.id, req.params.resumeId));
}

async function remove(req, res) {
  return ok(res, await resumesService.remove(req.user.id, req.params.resumeId));
}

// Streams the file from disk after the authorization check.
// Resumes are NEVER exposed through a static file route.
async function download(req, res) {
  const resume = await resumesService.getForDownload(req.user, req.params.resumeId);
  const filePath = resumesService.absolutePath(resume);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Stored file is missing' } });
  }

  res.setHeader('Content-Type', resume.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${resumesService.safeFileName(resume)}"`);
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { listMine, upload, setDefault, remove, download };
