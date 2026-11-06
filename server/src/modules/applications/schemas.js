const { z } = require('zod');

const applySchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  resumeId: z.string().min(1).optional().nullable(),
  coverNote: z.string().trim().max(3000).optional().nullable(),
});

const applicationStatusSchema = z.object({
  status: z.enum(['IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED']),
});

const companyListQuerySchema = z.object({
  status: z.enum(['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN']).optional(),
  jobId: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const noteSchema = z.object({
  content: z.string().trim().min(1, 'Note content is required').max(4000),
});

module.exports = { applySchema, applicationStatusSchema, companyListQuerySchema, noteSchema };
