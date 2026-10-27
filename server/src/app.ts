import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import healthRouter from './routes/health';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/health', healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
