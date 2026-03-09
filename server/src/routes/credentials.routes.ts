import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { credentialsSchema } from '../utils/validators';
import { getCredentials, upsertCredentials } from '../services/credentials.service';

const router = Router();
router.use(authMiddleware);

router.get('/linkedin', (req: Request, res: Response) => {
  const creds = getCredentials(req.user!.userId, 'linkedin');
  res.json(creds ? { configured: true, email: creds.email } : { configured: false });
});

router.put('/linkedin', (req: Request, res: Response) => {
  const { email, password } = credentialsSchema.parse(req.body);
  upsertCredentials(req.user!.userId, email, password, 'linkedin');
  res.json({ message: 'LinkedIn credentials saved', configured: true, email });
});

export default router;
