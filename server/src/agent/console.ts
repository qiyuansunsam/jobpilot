import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { config } from '../config';
import { tools, ToolContext } from './tools';
import { ClaudeError } from '../services/claude.service';

export interface ConsoleTurn { role: 'user' | 'assistant'; content: string }
export interface ConsoleEvent { tool: string; input: unknown; summary: string; ok: boolean; data?: unknown }
export interface ConsoleResult { reply: string; events: ConsoleEvent[] }

let client: Anthropic | null = null;
const getClient = () => (client ||= new Anthropic());

const MAX_HISTORY = 30;

function systemPrompt(username: string, context?: string) {
  return `You are the JobPilot admin console: an agent with full access to this user's JobPilot account through tools.

User: ${username}. Today: ${new Date().toISOString().slice(0, 10)}.

You can read and change the profile and preferences, list and edit saved applications, check the LinkedIn session, search LinkedIn jobs, fetch job details, generate tailored cover letters and screening answers, and submit Easy Apply.

Rules:
- Act, don't describe. If the user asks for something a tool can do, call the tool.
- easy_apply is irreversible and acts on the user's real LinkedIn account. Only call it when the user has explicitly asked to apply in this conversation. Never apply speculatively or in bulk without a stated limit.
- search_jobs is slow; one search per request unless asked otherwise.
- When editing cover letters or answers, show the new text and save it with update_application_content if the user wants it kept.
- Never invent experience or skills the CV does not support.
- Be concise. Use short markdown. Reference applications by #id and jobs by title @ company.
${context ? `\nCurrent UI context:\n${context}` : ''}`;
}

export async function runConsole(userId: number, username: string, history: ConsoleTurn[], context?: string): Promise<ConsoleResult> {
  const events: ConsoleEvent[] = [];
  const ctx: ToolContext = { userId };

  const runnable = tools.map(t => betaZodTool({
    name: t.name,
    description: t.description,
    inputSchema: t.schema,
    run: async (input: any) => {
      try {
        const out = await t.run(ctx, input);
        const ok = !(out.result && typeof out.result === 'object' && 'error' in (out.result as any));
        events.push({ tool: t.name, input, summary: out.summary, ok, data: out.data });
        return JSON.stringify(out.result ?? null);
      } catch (err: any) {
        const msg = err?.message || String(err);
        events.push({ tool: t.name, input, summary: `${t.name} failed: ${msg}`, ok: false });
        return JSON.stringify({ error: msg });
      }
    },
  }));

  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .slice(-MAX_HISTORY)
    .filter(m => m.content?.trim())
    .map(m => ({ role: m.role, content: m.content }));
  if (!messages.length || messages[0].role !== 'user') {
    throw new ClaudeError('Conversation must start with a user message');
  }

  try {
    const final = await getClient().beta.messages.toolRunner({
      model: config.claudeModel,
      max_tokens: 8192,
      system: systemPrompt(username, context),
      tools: runnable,
      messages,
      max_iterations: 12,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (final.stop_reason === 'refusal') throw new ClaudeError('Claude declined this request.');

    const reply = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map(b => b.text).join('').trim();
    return { reply: reply || (events.length ? 'Done.' : ''), events };
  } catch (err: any) {
    if (err instanceof ClaudeError) throw err;
    if (err instanceof Anthropic.AuthenticationError || /authentication method/i.test(err?.message || '')) {
      throw new ClaudeError('No valid Anthropic credentials. Set ANTHROPIC_API_KEY in .env (or run `ant auth login`) and restart the server.', 401);
    }
    if (err instanceof Anthropic.APIError) throw new ClaudeError(`Claude API error ${err.status}: ${err.message}`, err.status);
    throw new ClaudeError(`Console request failed: ${err?.message || err}`);
  }
}
