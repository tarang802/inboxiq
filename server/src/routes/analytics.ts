import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { analyticsSummary } from '../services/analytics';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    res.json({ analytics: await analyticsSummary(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
