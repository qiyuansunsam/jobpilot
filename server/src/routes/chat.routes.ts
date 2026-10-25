import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { askClaude } from '../services/claude.service';
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

    const reply = await askClaude(systemPrompt, message);
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
