import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { unsubscribeLimiter } from '../middleware/rateLimit';
import {
  SORTS,
  bulkSetStatus,
  bulkUnsubscribe,
  listSenders,
  senderSummary,
  setSenderStatus,
  unsubscribeSender,
  type SenderSort,
} from '../services/senders';
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

router.get('/summary', async (req, res, next) => {
  try {
    res.json({ summary: await senderSummary(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

// ids are cuids; anything else is a typo or someone poking at the api
const idParams = z.object({
  id: z
    .string()
    .max(40)
    .regex(/^[a-z0-9]+$/i, 'invalid sender id'),
});

// unsubscribing has its own flow, so only these can be set by hand
const statusBody = z.object({ status: z.enum(['ACTIVE', 'KEPT', 'IGNORED']) });

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = parse(idParams, req.params);
    const { status } = parse(statusBody, req.body);
    const sender = await setSenderStatus(req.user!.id, id, status);
    res.json({ sender });
  } catch (err) {
    next(err);
  }
});

const BULK_STATUS = { keep: 'KEPT', ignore: 'IGNORED', reset: 'ACTIVE' } as const;

const bulkBody = z.object({
  ids: z.array(idParams.shape.id).min(1).max(100),
  action: z.enum(['keep', 'ignore', 'reset', 'unsubscribe']),
});

router.post('/bulk', unsubscribeLimiter, async (req, res, next) => {
  try {
    const { ids, action } = parse(bulkBody, req.body);
    const userId = req.user!.id;
    const unique = [...new Set(ids)];

    const result =
      action === 'unsubscribe'
        ? await bulkUnsubscribe(userId, unique)
        : await bulkSetStatus(userId, unique, BULK_STATUS[action]);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const unsubscribeBody = z.object({ confirm: z.boolean().default(false) });

router.post('/:id/unsubscribe', unsubscribeLimiter, async (req, res, next) => {
  try {
    const { id } = parse(idParams, req.params);
    const { confirm } = parse(unsubscribeBody, req.body ?? {});
    const sender = await unsubscribeSender(req.user!.id, id, confirm);
    res.json({ sender });
  } catch (err) {
    next(err);
  }
});

export default router;
