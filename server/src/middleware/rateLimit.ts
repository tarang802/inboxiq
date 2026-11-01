import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const MINUTE = 60 * 1000;

const limiter = (windowMs: number, limit: number, error: string, byUser = false) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error },
    // signed-in limits follow the account, so switching networks doesn't reset them
    keyGenerator: byUser
      ? (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? '')
      : undefined,
  });

export const apiLimiter = limiter(15 * MINUTE, 600, 'too many requests, please slow down');

export const authLimiter = limiter(15 * MINUTE, 30, 'too many sign-in attempts, try again later');

// each sync reads thousands of messages from gmail
export const syncLimiter = limiter(60 * MINUTE, 10, 'too many syncs, try again later', true);

// every unsubscribe makes a request to someone else's server
export const unsubscribeLimiter = limiter(MINUTE, 30, 'too many unsubscribes, slow down', true);
