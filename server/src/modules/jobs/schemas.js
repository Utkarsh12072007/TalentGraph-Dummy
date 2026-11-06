const { z } = require('zod');

const jobCoreSchema = {
  title: z.string().trim().min(3, 'Job title is required').max(150),
  description: z.string().trim().min(30, 'Description must be at least 30 characters').max(20000),
  responsibilities: z.string().trim().max(20000).optional(),
  requirements: z.string().trim().max(20000).optional(),
  location: z.string().trim().max(120).optional(),
  workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  experienceMin: z.coerce.number().int().min(0).max(40).default(0),
  experienceMax: z.coerce.number().int().min(0).max(50).optional().nullable(),
  salaryMin: z.coerce.number().int().min(0).max(100000000).optional().nullable(),
  salaryMax: z.coerce.number().int().min(0).max(100000000).optional().nullable(),
  currency: z.string().trim().min(1).max(8).default('USD'),
  deadline: z.coerce.date().optional().nullable(),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        isRequired: z.coerce.boolean().default(true),
      })
    )
    .max(30)
    .default([]),
};

const createJobSchema = z
  .object({ status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'), ...jobCoreSchema })
  .refine(
    (v) => v.experienceMax === null || v.experienceMax === undefined || v.experienceMax >= v.experienceMin,
    { message: 'Maximum experience must be greater than or equal to minimum', path: ['experienceMax'] }
  )
  .refine(
    (v) => v.salaryMax === null || v.salaryMax === undefined || v.salaryMax === 0 || v.salaryMax >= (v.salaryMin || 0),
    { message: 'Maximum salary must be greater than or equal to minimum', path: ['salaryMax'] }
  );

const updateJobSchema = z
  .object(jobCoreSchema)
  .partial()
  .refine(
    (v) => v.experienceMax === null || v.experienceMax === undefined || (v.experienceMin === undefined ? true : v.experienceMax >= v.experienceMin),
    { message: 'Maximum experience must be greater than or equal to minimum', path: ['experienceMax'] }
  );

const jobStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'CLOSED', 'ARCHIVED']),
});

// Public job search — every filter maps to a real database query condition.
const searchJobsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  workMode: z.string().optional(), // comma list: REMOTE,HYBRID
  employmentType: z.string().optional(), // comma list: FULL_TIME,INTERNSHIP
  experience: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD']).optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['recent', 'salary_desc', 'salary_asc']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobStatusSchema,
  searchJobsSchema,
};
