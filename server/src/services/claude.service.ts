import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

/**
 * Single place the app talks to Claude.
 * Credentials come from the environment: ANTHROPIC_API_KEY (in .env), or an
 * `ant auth login` profile on the machine. Nothing is proxied or hand-rolled.
 */
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export class ClaudeError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function askClaude(system: string, user: string, maxTokens = 8192): Promise<string> {
  try {
    const res = await getClient().beta.messages.create({
      model: config.claudeModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (res.stop_reason === 'refusal') {
      throw new ClaudeError('Claude declined this request.');
    }

    return res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  } catch (err: any) {
    if (err instanceof ClaudeError) throw err;
    if (err instanceof Anthropic.AuthenticationError || /authentication method/i.test(err?.message || '')) {
      throw new ClaudeError('No valid Anthropic credentials. Set ANTHROPIC_API_KEY in .env (or run `ant auth login`) and restart the server.', 401);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ClaudeError('Claude is rate limited, try again in a moment.', 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new ClaudeError(`Claude API error ${err.status}: ${err.message}`, err.status);
    }
    throw new ClaudeError(`Claude request failed: ${err?.message || err}`);
  }
}
