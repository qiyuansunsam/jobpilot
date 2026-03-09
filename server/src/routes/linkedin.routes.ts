import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { credentialLogin, checkSession, logoutLinkedIn, searchJobs, getJob, getJobSkills, easyApply } from '../services/linkedin.service';

const router = Router();
router.use(authMiddleware);

router.get('/session', async (req: Request, res: Response) => {
  try {
    const result = await checkSession(req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.json({ authenticated: false });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email and password are required' });
      return;
    }
    const result = await credentialLogin(req.user!.userId, email, password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    await logoutLinkedIn(req.user!.userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { keywords, location_name, experience, job_type, remote, limit } = req.body;
    const result = await searchJobs(req.user!.userId, {
      keywords, location_name, experience, job_type, remote, limit: limit || 10,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/job/:id', async (req: Request, res: Response) => {
  try {
    const job = await getJob(req.user!.userId, req.params.id as string);
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/job/:id/skills', async (req: Request, res: Response) => {
  try {
    const skills = await getJobSkills(req.user!.userId, req.params.id as string);
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply/:id', async (req: Request, res: Response) => {
  try {
    const { answers } = req.body;
    const result = await easyApply(req.user!.userId, req.params.id as string, answers);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
