const { z } = require('zod');

const dateSchema = z.coerce.date();
const optionalDate = z.coerce.date().optional().nullable();

const updateProfileSchema = z.object({
  headline: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  yearsExperience: z.coerce.number().int().min(0).max(50).optional().nullable(),
});

// Plain field objects (so we can build both create and update schemas).
const educationFields = {
  institution: z.string().trim().min(2).max(150),
  degree: z.string().trim().min(2).max(150),
  field: z.string().trim().max(150).optional().nullable(),
  startDate: dateSchema,
  endDate: optionalDate,
  grade: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
};

const experienceFields = {
  company: z.string().trim().min(1).max(150),
  title: z.string().trim().min(2).max(150),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  startDate: dateSchema,
  endDate: optionalDate,
  description: z.string().trim().max(4000).optional().nullable(),
};

// Cross-field rule only applies when BOTH dates are present (safe for partial updates).
const dateOrderCheck = (data, ctx) => {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be after the start date' });
  }
};

const educationSchema = z.object(educationFields).superRefine(dateOrderCheck);
const educationUpdateSchema = z.object(educationFields).partial().superRefine(dateOrderCheck);

const experienceSchema = z.object(experienceFields).superRefine(dateOrderCheck);
const experienceUpdateSchema = z.object(experienceFields).partial().superRefine(dateOrderCheck);

const skillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required').max(60),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().nullable(),
});

const projectSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(4000).optional().nullable(),
  link: z.string().trim().url('Enter a valid URL').max(300).optional().or(z.literal('')).nullable(),
  techStack: z.string().trim().max(300).optional().nullable(),
  startDate: optionalDate,
  endDate: optionalDate,
});

const certificationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  issuer: z.string().trim().min(1).max(150),
  issueDate: dateSchema,
  expiryDate: optionalDate,
  credentialId: z.string().trim().max(100).optional().nullable(),
  link: z.string().trim().url('Enter a valid URL').max(300).optional().or(z.literal('')).nullable(),
});

module.exports = {
  updateProfileSchema,
  educationSchema,
  educationUpdateSchema,
  experienceSchema,
  experienceUpdateSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
};
