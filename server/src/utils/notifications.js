// In-app notifications. Called by other services when something happens
// that a user should see (status change, interview scheduled, ...).
// Writing a notification must never break the main request flow.

const prisma = require('../lib/prisma');

async function notify(userId, { type, title, message, link = null }) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  } catch (err) {
    console.error('[notify] Failed to create notification:', err.message);
  }
}

async function notifyMany(userIds, payload) {
  await Promise.all([...new Set(userIds)].map((userId) => notify(userId, payload)));
}

module.exports = { notify, notifyMany };
