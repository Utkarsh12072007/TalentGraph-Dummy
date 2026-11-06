// Central configuration. Fails fast if a required variable is missing,
// so misconfiguration is caught at startup instead of at request time.
// override: true makes our .env win over any DATABASE_URL already present in
// the machine's environment (e.g. injected by hosting sandboxes).
// In TEST mode the harness provides env vars explicitly — skip the file.
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ override: true });
}

const path = require('path');

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 4000),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: required('DATABASE_URL'),
  // Where uploaded files live. Resumes and logos are stored on the local
  // filesystem (development choice). See README for the production limitation.
  uploadDir: path.join(__dirname, '..', '..', 'uploads'),
};

module.exports = env;
