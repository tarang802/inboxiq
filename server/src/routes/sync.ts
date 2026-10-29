import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { latestSync, startSync } from '../services/sync';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const sync = await startSync(req.user!);
    res.status(202).json({ sync });
  } catch (err) {
    next(err);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    const sync = await latestSync(req.user!.id);
    res.json({ sync });
  } catch (err) {
    next(err);
  }
});

export default router;
