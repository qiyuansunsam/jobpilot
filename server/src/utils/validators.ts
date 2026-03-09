import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(128),
});

export const loginSchema = registerSchema;

export const profileUpdateSchema = z.object({
  additional_info: z.string().max(10000).optional(),
});

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const preferencesSchema = z.object({
  job_titles: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  salary_min: z.number().nullable().default(null),
  salary_max: z.number().nullable().default(null),
  experience: z.enum(['entry', 'mid', 'senior', 'lead']).nullable().default(null),
  industries: z.array(z.string()).default([]),
});

export const generateSchema = z.object({
  jobDescription: z.string().min(10),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  jobUrl: z.string().url().optional(),
  generateType: z.enum(['cover_letter', 'screening_answers', 'both']).default('both'),
  screeningQuestions: z.array(z.string()).optional(),
});
