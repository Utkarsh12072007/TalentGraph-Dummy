const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { ApiError } = require('../../utils/ApiError');

async function updateMe(userId, { fullName }) {
  return prisma.user.update({
    where: { id: userId },
    data: { ...(fullName ? { fullName } : {}) },
    select: { id: true, email: true, fullName: true, role: true },
  });
}

// Changing the password bumps tokenVersion so other devices are signed out.
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  return { success: true };
}

module.exports = { updateMe, changePassword };
