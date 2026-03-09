import { Router, Request, Response } from 'express';
import { registerSchema, loginSchema } from '../utils/validators';
import { createUser, authenticateUser, signToken } from '../services/auth.service';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    const user = createUser(username, password);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    throw err;
  }
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);
  const user = authenticateUser(username, password);
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username } });
});

export default router;
