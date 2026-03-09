import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { generateSchema } from '../utils/validators';
import { generateContent } from '../services/ai.service';
import { getProfile } from '../services/profile.service';
import { getPreferences } from '../services/preferences.service';
import { createApplication } from '../services/applications.service';

const router = Router();
router.use(authMiddleware);

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const data = generateSchema.parse(req.body);
    const profile = getProfile(req.user!.userId);
    const prefs = getPreferences(req.user!.userId);

    const result = await generateContent(
      profile?.cv_text || '',
      profile?.additional_info || '',
      {
        job_titles: prefs?.job_titles || '[]',
        locations: prefs?.locations || '[]',
        experience: prefs?.experience || null,
      },
      data
    );

    // Save as application
    const app = createApplication(req.user!.userId, {
      job_title: data.jobTitle || 'Untitled Position',
      company: data.company,
      job_url: data.jobUrl,
      job_description: data.jobDescription,
      generated_cover: result.coverLetter || undefined,
      generated_answers: result.screeningAnswers || undefined,
    });

    res.json({ application: app, generated: result });
  } catch (err: any) {
    if (err?.status === 401) {
      res.status(500).json({ error: 'Invalid Anthropic API key' });
      return;
    }
    throw err;
  }
});

export default router;
