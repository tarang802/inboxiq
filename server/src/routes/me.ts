import { Router } from 'express';
import { prisma } from '../lib/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
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

export default router;
