const { z } = require('zod');
const { passwordSchema } = require('../auth/schemas');

const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

module.exports = { updateMeSchema, changePasswordSchema };
