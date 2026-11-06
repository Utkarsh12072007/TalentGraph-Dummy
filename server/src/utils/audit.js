// Audit logging for security-relevant / administrative actions.
// Failures to write an audit log must never break the user's request,
// so every write is caught and logged to the server console instead.

const prisma = require('../lib/prisma');

async function audit(actorId, action, entityType, entityId, metadata = undefined) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entityType, entityId: entityId || null, metadata },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { audit };
