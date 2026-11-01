import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import syncRouter from './routes/sync';
import sendersRouter from './routes/senders';
import analyticsRouter from './routes/analytics';
import { loadSession } from './middleware/auth';
import { apiLimiter, authLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  // every body we accept is a few ids or flags
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/health', healthRouter);
  app.use(apiLimiter);
  app.use(loadSession);
  app.use('/auth', authLimiter, authRouter);
  app.use('/me', meRouter);
  app.use('/sync', syncRouter);
  app.use('/senders', sendersRouter);
  app.use('/analytics', analyticsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
