import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getApplications, getApplication, updateApplicationStatus } from '../services/applications.service';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const apps = getApplications(req.user!.userId);
  res.json(apps);
});

router.get('/:id', (req: Request, res: Response) => {
  const app = getApplication(req.user!.userId, parseInt(req.params.id as string));
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  res.json(app);
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['generated', 'applied', 'rejected', 'interview'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  updateApplicationStatus(req.user!.userId, parseInt(req.params.id as string), status);
  res.json({ message: 'Status updated' });
});

export default router;
