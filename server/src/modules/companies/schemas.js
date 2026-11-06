const { z } = require('zod');

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(120),
  website: z.string().trim().url('Enter a valid URL').max(200).optional().or(z.literal('')),
  industry: z.string().trim().max(80).optional(),
  size: z.enum(COMPANY_SIZES).optional(),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().max(4000).optional(),
});

const updateCompanySchema = createCompanySchema.partial();

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: z.enum(['ADMIN', 'RECRUITER', 'INTERVIEWER']).default('RECRUITER'),
});

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'RECRUITER', 'INTERVIEWER']),
});

module.exports = { createCompanySchema, updateCompanySchema, addMemberSchema, updateMemberSchema, COMPANY_SIZES };
