import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

// body-parser errors carry a type and a 4xx status, e.g. malformed or oversized json
const BODY_ERRORS: Record<string, string> = {
  'entity.parse.failed': 'request body is not valid json',
  'entity.too.large': 'request body is too large',
};

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  const bodyError = err as { type?: string; status?: number };
  if (bodyError.type && BODY_ERRORS[bodyError.type]) {
    return res.status(bodyError.status ?? 400).json({ error: BODY_ERRORS[bodyError.type] });
  }

  console.error(err);
  res.status(500).json({ error: 'something went wrong' });
}
