const { z } = require('zod');

const scheduleSchema = z.object({
  applicationId: z.string().min(1, 'Application is required'),
  round: z.coerce.number().int().min(1).max(20).default(1),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(10).max(480).default(45),
  type: z.enum(['PHONE', 'VIDEO', 'ON_SITE']),
  locationOrLink: z.string().trim().max(500).optional().nullable(),
  interviewerIds: z.array(z.string()).max(10).default([]),
});

const updateSchema = scheduleSchema
  .omit({ applicationId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be 1-5').max(5),
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE']),
  strengths: z.string().trim().max(4000).optional().nullable(),
  improvements: z.string().trim().max(4000).optional().nullable(),
  comments: z.string().trim().max(4000).optional().nullable(),
});

module.exports = { scheduleSchema, updateSchema, feedbackSchema };
