import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { preferencesSchema } from '../utils/validators';
import { getPreferences, updatePreferences } from '../services/preferences.service';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const prefs = getPreferences(req.user!.userId);
  if (prefs) {
    res.json({
      ...prefs,
      job_titles: JSON.parse(prefs.job_titles || '[]'),
      locations: JSON.parse(prefs.locations || '[]'),
      industries: JSON.parse(prefs.industries || '[]'),
    });
  } else {
    res.json(null);
  }
});

router.put('/', (req: Request, res: Response) => {
  const data = preferencesSchema.parse(req.body);
  updatePreferences(req.user!.userId, data);
  res.json({ message: 'Preferences updated' });
});

export default router;
