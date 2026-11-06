const prisma = require('../../lib/prisma');
const { ok, pageMeta } = require('../../utils/respond');

async function list(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 50);
  const where = { userId: req.user.id };

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok(res, { notifications, unreadCount, meta: pageMeta(total, page, limit) });
}

// Mark some (or all) notifications as read.
async function markRead(req, res) {
  const { ids, all = false } = req.body;
  await prisma.notification.updateMany({
    where: { userId: req.user.id, ...(all ? {} : { id: { in: ids || [] } }) },
    data: { isRead: true },
  });
  return ok(res, { success: true });
}

module.exports = { list, markRead };
