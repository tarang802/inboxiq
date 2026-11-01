import { Router } from 'express';
import { prisma } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { deleteAccount } from '../services/account';
import { SESSION_COOKIE } from '../services/session';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const account = await prisma.googleAccount.findUnique({
      where: { userId: req.user!.id },
      select: { tokenValid: true },
    });

    // false once google rejects the stored token, so the client can ask to reconnect
    res.json({ user: req.user, gmailConnected: Boolean(account?.tokenValid) });
  } catch (err) {
    next(err);
  }
});

// "delete my data": the account and every row tied to it
router.delete('/', async (req, res, next) => {
  try {
    await deleteAccount(req.user!.id);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
