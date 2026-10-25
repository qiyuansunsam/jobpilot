import { z } from 'zod/v4';
import { getProfile, updateAdditionalInfo, summarizeCV } from '../services/profile.service';
import { getPreferences, updatePreferences } from '../services/preferences.service';
import {
  getApplications, getApplication, updateApplicationStatus, updateApplicationContent,
} from '../services/applications.service';
import { checkSession, searchJobs, getJob, easyApply } from '../services/linkedin.service';
import { generateContent } from '../services/ai.service';
import { createApplication } from '../services/applications.service';

/**
 * The JobPilot tool set. Defined once, served two ways:
 *  - the in-app admin console (Claude via the Anthropic SDK tool runner)
 *  - the MCP server (src/mcp.ts) for local AI clients
 *
 * `run` returns { result, summary, data? }:
 *   result  - what the model sees (kept compact)
 *   summary - one line for the UI activity log
 *   data    - optional full payload for the UI to act on (e.g. job list)
 */
export interface ToolContext { userId: number }
export interface ToolOutput { result: unknown; summary: string; data?: unknown }
export interface ConsoleTool<S extends z.ZodObject<any> = z.ZodObject<any>> {
  name: string;
  description: string;
  schema: S;
  run: (ctx: ToolContext, input: z.infer<S>) => Promise<ToolOutput>;
}

function define<S extends z.ZodObject<any>>(t: ConsoleTool<S>): ConsoleTool<S> { return t; }

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '');

export const tools: ConsoleTool<any>[] = [
  define({
    name: 'get_profile',
    description: 'Read the user\'s profile: CV filename, CV text (truncated) and additional info.',
    schema: z.object({}),
    run: async ({ userId }) => {
      const p = getProfile(userId);
      return {
        result: p ? { cv_filename: p.cv_filename, cv_text: clip(p.cv_text, 6000), additional_info: p.additional_info, updated_at: p.updated_at } : null,
        summary: p?.cv_filename ? `Read profile (CV: ${p.cv_filename})` : 'Read profile (no CV uploaded)',
      };
    },
  }),

  define({
    name: 'update_additional_info',
    description: 'Replace the free-text "additional info" on the profile (things not in the CV: visa status, salary expectations, notice period, etc).',
    schema: z.object({ additional_info: z.string().max(10000) }),
    run: async ({ userId }, { additional_info }) => {
      updateAdditionalInfo(userId, additional_info);
      return { result: { ok: true }, summary: 'Updated additional info' };
    },
  }),

  define({
    name: 'summarize_cv',
    description: 'Return a structured summary of the uploaded CV (name, headline, skills, experience, education).',
    schema: z.object({}),
    run: async ({ userId }) => {
      const s = await summarizeCV(userId);
      return { result: s ?? { error: 'No CV uploaded' }, summary: s ? 'Summarised CV' : 'No CV to summarise' };
    },
  }),

  define({
    name: 'get_preferences',
    description: 'Read job search preferences: target titles, locations, salary range, experience level, industries.',
    schema: z.object({}),
    run: async ({ userId }) => {
      const p = getPreferences(userId);
      const parse = (s: string | null | undefined) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
      return {
        result: p ? { job_titles: parse(p.job_titles), locations: parse(p.locations), salary_min: p.salary_min, salary_max: p.salary_max, experience: p.experience, industries: parse(p.industries) } : null,
        summary: 'Read preferences',
      };
    },
  }),

  define({
    name: 'update_preferences',
    description: 'Replace job search preferences. Pass every field; omitted arrays become empty.',
    schema: z.object({
      job_titles: z.array(z.string()).default([]),
      locations: z.array(z.string()).default([]),
      salary_min: z.number().nullable().default(null),
      salary_max: z.number().nullable().default(null),
      experience: z.enum(['entry', 'mid', 'senior', 'lead']).nullable().default(null),
      industries: z.array(z.string()).default([]),
    }),
    run: async ({ userId }, prefs) => {
      updatePreferences(userId, prefs);
      return { result: { ok: true, prefs }, summary: 'Updated preferences', data: prefs };
    },
  }),

  define({
    name: 'list_applications',
    description: 'List saved applications (generated cover letters / answers), newest first. Optionally filter by status.',
    schema: z.object({ status: z.enum(['generated', 'applied', 'rejected', 'interview']).optional(), limit: z.number().int().min(1).max(100).default(25) }),
    run: async ({ userId }, { status, limit }) => {
      let apps = getApplications(userId);
      if (status) apps = apps.filter(a => a.status === status);
      apps = apps.slice(0, limit);
      return {
        result: apps.map(a => ({ id: a.id, job_title: a.job_title, company: a.company, status: a.status, job_url: a.job_url, created_at: a.created_at, applied_at: a.applied_at, has_cover: !!a.generated_cover, has_answers: !!a.generated_answers })),
        summary: `Listed ${apps.length} application${apps.length === 1 ? '' : 's'}${status ? ` (${status})` : ''}`,
        data: apps,
      };
    },
  }),

  define({
    name: 'get_application',
    description: 'Read one saved application in full, including the generated cover letter and screening answers.',
    schema: z.object({ id: z.number().int() }),
    run: async ({ userId }, { id }) => {
      const a = getApplication(userId, id);
      return { result: a ?? { error: `Application ${id} not found` }, summary: a ? `Read application #${id} (${a.job_title})` : `Application #${id} not found` };
    },
  }),

  define({
    name: 'update_application_status',
    description: 'Set an application\'s status: generated, applied, interview or rejected.',
    schema: z.object({ id: z.number().int(), status: z.enum(['generated', 'applied', 'rejected', 'interview']) }),
    run: async ({ userId }, { id, status }) => {
      if (!getApplication(userId, id)) return { result: { error: 'not found' }, summary: `Application #${id} not found` };
      updateApplicationStatus(userId, id, status);
      return { result: { ok: true }, summary: `Application #${id} marked ${status}`, data: { id, status } };
    },
  }),

  define({
    name: 'update_application_content',
    description: 'Overwrite the stored cover letter and/or screening answers of a saved application (use after editing text for the user).',
    schema: z.object({ id: z.number().int(), generated_cover: z.string().optional(), generated_answers: z.string().optional() }),
    run: async ({ userId }, { id, generated_cover, generated_answers }) => {
      if (!getApplication(userId, id)) return { result: { error: 'not found' }, summary: `Application #${id} not found` };
      updateApplicationContent(userId, id, { generated_cover, generated_answers });
      return { result: { ok: true }, summary: `Saved edits to application #${id}` };
    },
  }),

  define({
    name: 'linkedin_status',
    description: 'Check whether a LinkedIn session is connected and whose it is.',
    schema: z.object({}),
    run: async ({ userId }) => {
      const s = await checkSession(userId);
      return { result: s, summary: s.authenticated ? `LinkedIn connected as ${s.name}` : 'LinkedIn not connected' };
    },
  }),

  define({
    name: 'search_jobs',
    description: 'Search LinkedIn jobs. Returns compact job cards; use get_job for a full description. Slow (30-90s). Requires a connected LinkedIn session.',
    schema: z.object({
      keywords: z.string().optional(),
      location: z.string().optional().describe('e.g. "Sydney, Australia"'),
      remote: z.array(z.enum(['1', '2', '3'])).optional().describe('1=onsite, 2=remote, 3=hybrid'),
      experience: z.array(z.enum(['1', '2', '3', '4', '5', '6'])).optional().describe('1=internship 2=entry 3=associate 4=mid-senior 5=director 6=executive'),
      limit: z.number().int().min(1).max(25).default(10),
    }),
    run: async ({ userId }, { keywords, location, remote, experience, limit }) => {
      const r = await searchJobs(userId, { keywords, location_name: location, remote, experience, limit });
      if (!r?.ok) return { result: { error: r?.error || 'search failed' }, summary: `Search failed: ${r?.error || 'unknown'}` };
      const jobs = r.jobs || [];
      return {
        result: jobs.map((j: any) => ({ job_id: j.job_id, title: j.title, company: j.company, location: j.location, workplace: j.workplace, is_easy_apply: j.is_easy_apply, description: clip(j.description, 400) })),
        summary: `Searched LinkedIn for "${keywords || ''}" ${location ? `in ${location} ` : ''}- ${jobs.length} result${jobs.length === 1 ? '' : 's'}`,
        data: { jobs },
      };
    },
  }),

  define({
    name: 'get_job',
    description: 'Fetch a LinkedIn job\'s full details and description by job_id.',
    schema: z.object({ job_id: z.string() }),
    run: async ({ userId }, { job_id }) => {
      const j = await getJob(userId, job_id);
      return { result: { ...j, description: clip(j?.description, 6000) }, summary: `Fetched job ${j?.title || job_id}`, data: { job: j } };
    },
  }),

  define({
    name: 'generate_application',
    description: 'Generate a tailored cover letter and/or screening answers for a job and save it as an application. Pass job_id (LinkedIn) or the job fields directly.',
    schema: z.object({
      job_id: z.string().optional(),
      job_title: z.string().optional(),
      company: z.string().optional(),
      job_url: z.string().optional(),
      job_description: z.string().optional(),
      generate_type: z.enum(['cover_letter', 'screening_answers', 'both']).default('both'),
      screening_questions: z.array(z.string()).optional(),
    }),
    run: async ({ userId }, input) => {
      let { job_title, company, job_url, job_description } = input;
      if (input.job_id && !job_description) {
        const j = await getJob(userId, input.job_id);
        job_title = job_title || j?.title; company = company || j?.company; job_description = j?.description;
        job_url = job_url || `https://www.linkedin.com/jobs/view/${input.job_id}`;
      }
      if (!job_description || job_description.length < 10) return { result: { error: 'job_description required' }, summary: 'Generation skipped: no job description' };
      const profile = getProfile(userId);
      const prefs = getPreferences(userId);
      const gen = await generateContent(profile?.cv_text || '', profile?.additional_info || '',
        { job_titles: prefs?.job_titles || '[]', locations: prefs?.locations || '[]', experience: prefs?.experience || null },
        { jobDescription: job_description, jobTitle: job_title, company, jobUrl: job_url, generateType: input.generate_type, screeningQuestions: input.screening_questions });
      const app = createApplication(userId, {
        job_title: job_title || 'Untitled Position', company, job_url, job_description,
        generated_cover: gen.coverLetter || undefined, generated_answers: gen.screeningAnswers || undefined,
      });
      return {
        result: { application_id: app.id, cover_letter: gen.coverLetter, screening_answers: gen.screeningAnswers },
        summary: `Generated ${input.generate_type.replace('_', ' ')} for ${job_title || 'job'}${company ? ` @ ${company}` : ''} (application #${app.id})`,
        data: { application: app },
      };
    },
  }),

  define({
    name: 'save_application',
    description: 'Save an application you wrote yourself (cover letter and/or screening answers) without calling Claude. Use this when you are the model doing the tailoring, e.g. from an MCP client. Returns the new application id.',
    schema: z.object({
      job_title: z.string(),
      company: z.string().optional(),
      job_url: z.string().optional(),
      job_description: z.string().min(10),
      cover_letter: z.string().optional(),
      screening_answers: z.string().optional(),
    }),
    run: async ({ userId }, input) => {
      const app = createApplication(userId, {
        job_title: input.job_title, company: input.company, job_url: input.job_url, job_description: input.job_description,
        generated_cover: input.cover_letter, generated_answers: input.screening_answers,
      });
      return { result: { application_id: app.id }, summary: `Saved application #${app.id} for ${input.job_title}${input.company ? ` @ ${input.company}` : ''}`, data: { application: app } };
    },
  }),

  define({
    name: 'easy_apply',
    description: 'Submit a LinkedIn Easy Apply for a job. Irreversible: only call when the user has clearly asked to apply. Optional answers map question text to answer.',
    schema: z.object({ job_id: z.string(), answers: z.record(z.string(), z.string()).optional() }),
    run: async ({ userId }, { job_id, answers }) => {
      const r = await easyApply(userId, job_id, answers);
      return { result: r, summary: r?.ok ? `Applied to job ${job_id}` : `Apply failed for ${job_id}: ${r?.error || 'unknown'}`, data: { job_id, ok: !!r?.ok } };
    },
  }),
];

export function toolByName(name: string) { return tools.find(t => t.name === name); }
