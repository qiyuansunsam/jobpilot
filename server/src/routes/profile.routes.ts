import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadCV } from '../middleware/upload';
import { profileUpdateSchema } from '../utils/validators';
import { getProfile, updateAdditionalInfo, updateCV } from '../services/profile.service';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const profile = getProfile(req.user!.userId);
  res.json(profile);
});

router.put('/', (req: Request, res: Response) => {
  const { additional_info } = profileUpdateSchema.parse(req.body);
  if (additional_info !== undefined) {
    updateAdditionalInfo(req.user!.userId, additional_info);
  }
  res.json(getProfile(req.user!.userId));
});

router.post('/cv', (req: Request, res: Response) => {
  uploadCV(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    try {
      const result = await updateCV(req.user!.userId, req.file);
      res.json({ message: 'CV uploaded', ...result });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to process CV' });
    }
  });
});

export default router;
