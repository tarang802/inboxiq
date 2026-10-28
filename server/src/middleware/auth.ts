import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE, findSession } from '../services/session';
import { unauthorized } from '../utils/httpError';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// attaches req.user when the session cookie is valid, never blocks the request
export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  try {
    const session = await findSession(token);
    if (session) {
      const { id, email, name, picture } = session.user;
      req.user = { id, email, name, picture };
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized('please sign in'));
  next();
}
