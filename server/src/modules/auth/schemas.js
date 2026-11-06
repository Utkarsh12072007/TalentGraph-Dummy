const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const registerSchema = z.object({
  role: z.enum(['CANDIDATE', 'RECRUITER'], {
    errorMap: () => ({ message: 'Choose Candidate or Recruiter' }),
  }),
  fullName: z.string().trim().min(2, 'Full name is too short').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: passwordSchema,
  // Only used when a recruiter creates a company during registration.
  companyName: z.string().trim().min(2).max(120).optional(),
  companyIndustry: z.string().trim().max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema, passwordSchema };
