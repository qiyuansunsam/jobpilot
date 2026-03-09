import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { getProfile } from '../services/profile.service';
import { getPreferences } from '../services/preferences.service';

const router = Router();
router.use(authMiddleware);

// Simple chat with Claude — context-aware with user's profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    const profile = getProfile(req.user!.userId);
    const prefs = getPreferences(req.user!.userId);

    const systemPrompt = `You are JobPilot AI Assistant. You help the user with job applications.

You have access to the user's profile:
- CV Text: ${(profile?.cv_text || '(not uploaded)').slice(0, 2000)}
- Additional Info: ${profile?.additional_info || '(none)'}
- Target Roles: ${prefs?.job_titles || '[]'}
- Locations: ${prefs?.locations || '[]'}
- Experience: ${prefs?.experience || 'Not set'}

${context ? `Current context:\n${context}` : ''}

You can help with:
- Rewriting/editing cover letters and screening answers
- Suggesting improvements to application content
- Answering questions about the job or application strategy
- Tailoring responses to specific job descriptions

Be concise and actionable. Output improved text directly when asked to edit.`;

    const response = await fetch(`${config.claudeProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude proxy error: ${response.status}`);
    }

    const data: any = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
