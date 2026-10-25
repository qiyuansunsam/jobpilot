import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { runConsole, ConsoleTurn } from '../agent/console';
import { tools } from '../agent/tools';

const router = Router();
router.use(authMiddleware);

/**
 * Admin console. Body: { messages: [{role, content}], context? }
 * Legacy single-shot form { message, context } is still accepted.
 * Response: { reply, events: [{tool, input, summary, ok, data?}] }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, message, context } = req.body || {};
    const history: ConsoleTurn[] = Array.isArray(messages) && messages.length
      ? messages
      : [{ role: 'user', content: String(message || '') }];
    const result = await runConsole(req.user!.userId, req.user!.username, history, context);
    res.json(result);
  } catch (err: any) {
    res.status(err?.status === 401 ? 503 : 500).json({ error: err.message });
  }
});

router.get('/tools', (_req: Request, res: Response) => {
  res.json(tools.map(t => ({ name: t.name, description: t.description })));
});

export default router;
