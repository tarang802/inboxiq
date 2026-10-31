import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { SORTS, listSenders, type SenderSort } from '../services/senders';
import { parse } from '../utils/validate';

const router = Router();

router.use(requireAuth);

const listQuery = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['ACTIVE', 'KEPT', 'IGNORED', 'UNSUBSCRIBED']).optional(),
  // query strings are text, so only the literal 'true' turns this on
  unsubscribable: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(Object.keys(SORTS) as [SenderSort, ...SenderSort[]]).default('clutter'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

router.get('/', async (req, res, next) => {
  try {
    const query = parse(listQuery, req.query);
    res.json(await listSenders(req.user!.id, query));
  } catch (err) {
    next(err);
  }
});

export default router;
