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
import { loadSession } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/health', healthRouter);
  app.use(loadSession);
  app.use('/auth', authRouter);
  app.use('/me', meRouter);
  app.use('/sync', syncRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
