import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'something went wrong' });
}
