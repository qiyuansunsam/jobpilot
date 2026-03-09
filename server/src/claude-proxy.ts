/**
 * Lightweight OpenAI-compatible proxy for the Anthropic API.
 * Uses Claude Max OAuth token from ~/.claude/.credentials.json (no API key needed).
 * Falls back to ANTHROPIC_API_KEY if set.
 * Runs on CLAUDE_PROXY_PORT (default 3456).
 */
import express from 'express';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.CLAUDE_PROXY_PORT || '3456', 10);
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Load OAuth token from Claude Code credentials
function loadToken(): string {
  // 1. Check for explicit API key first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // 2. Load OAuth token from Claude Code session (~/.claude/.credentials.json)
  try {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const credPath = path.join(home, '.claude', '.credentials.json');
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    const token = creds?.claudeAiOauth?.accessToken;
    if (token) {
      console.log('[claude-proxy] Using Claude Max OAuth token');
      return token;
    }
  } catch {}

  console.error('[claude-proxy] No API key or OAuth token found. AI features will not work.');
  return '';
}

let authToken = loadToken();

// Model mapping: translate common names to actual Anthropic model IDs
function resolveModel(model: string): string {
  const map: Record<string, string> = {
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-sonnet': 'claude-sonnet-4-20250514',
    'claude-haiku': 'claude-haiku-4-5-20251001',
    'claude-opus-4': 'claude-opus-4-20250514',
  };
  return map[model] || model;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/v1/chat/completions', async (req, res) => {
  try {
    if (!authToken) {
      // Try reloading in case token was added after startup
      authToken = loadToken();
      if (!authToken) {
        res.status(500).json({ error: 'No Anthropic API key or Claude Max OAuth token found' });
        return;
      }
    }

    const { model, messages, max_tokens = 4096 } = req.body;

    // Separate system messages from user/assistant messages
    const systemMessages = messages.filter((m: any) => m.role === 'system');
    const chatMessages = messages.filter((m: any) => m.role !== 'system');
    const systemPrompt = systemMessages.map((m: any) => m.content).join('\n\n') || undefined;

    const body: any = {
      model: resolveModel(model || 'claude-sonnet-4'),
      max_tokens,
      messages: chatMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const apiRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': authToken,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error(`[claude-proxy] Anthropic API error ${apiRes.status}:`, errText.slice(0, 300));

      // If 401, try refreshing token
      if (apiRes.status === 401) {
        authToken = loadToken();
      }

      res.status(apiRes.status).json({ error: `Anthropic API error: ${apiRes.status}` });
      return;
    }

    const data: any = await apiRes.json();

    // Convert to OpenAI-compatible response format
    const content = (data.content || [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    res.json({
      id: data.id,
      object: 'chat.completion',
      model: data.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      }],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    });
  } catch (err: any) {
    console.error('[claude-proxy]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', hasToken: !!authToken });
});

export function startProxy() {
  app.listen(PORT, () => {
    console.log(`[claude-proxy] Running on http://127.0.0.1:${PORT} (token: ${authToken ? 'loaded' : 'MISSING'})`);
  });
}
