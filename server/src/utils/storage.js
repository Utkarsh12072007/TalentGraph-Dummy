// File storage (local filesystem — the selected development approach).
//
// Two kinds of files:
// - Resumes: PRIVATE. Stored with a random name and only reachable through
//   GET /api/resumes/:id/download after an authorization check. Never served
//   statically.
// - Company logos: effectively public branding assets, served statically
//   from /uploads/logos (see app.js).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const { ApiError } = require('./ApiError');

const RESUME_DIR = path.join(env.uploadDir, 'resumes');
const LOGO_DIR = path.join(env.uploadDir, 'logos');

for (const dir of [RESUME_DIR, LOGO_DIR]) fs.mkdirSync(dir, { recursive: true });

const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const RESUME_MIME_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
const LOGO_MIME_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function makeUploader({ mimeTypes, maxBytes, dir }) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => {
        // Random name: the client never controls the path on disk.
        const ext = mimeTypes[file.mimetype] || path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      if (!mimeTypes[file.mimetype]) {
        return cb(ApiError.badRequest(
          `Unsupported file type "${file.mimetype}". Allowed: ${Object.values(mimeTypes).join(', ')}`
        ));
      }
      cb(null, true);
    },
  });
}

const uploadResume = makeUploader({ mimeTypes: RESUME_MIME_TYPES, maxBytes: RESUME_MAX_BYTES, dir: RESUME_DIR });
const uploadLogo = makeUploader({ mimeTypes: LOGO_MIME_TYPES, maxBytes: LOGO_MAX_BYTES, dir: LOGO_DIR });

function resumePath(storedName) {
  // path.basename prevents path traversal if a bad storedName ever sneaks in.
  return path.join(RESUME_DIR, path.basename(storedName));
}

function logoPath(storedName) {
  return path.join(LOGO_DIR, path.basename(storedName));
}

function removeFileIfExists(filePath) {
  fs.promises.unlink(filePath).catch(() => {
    /* file already gone — nothing to do */
  });
}

module.exports = {
  uploadResume,
  uploadLogo,
  resumePath,
  logoPath,
  removeFileIfExists,
  RESUME_MAX_BYTES,
  LOGO_MAX_BYTES,
};
