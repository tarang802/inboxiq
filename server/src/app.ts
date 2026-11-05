import path from 'node:path';
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

// the api only ever returns json and redirects, so its responses may load nothing at all
const apiHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
});

// the built client loads only its own files, plus google profile pictures.
// radix and sonner inject small <style> tags at runtime, so styles allow inline; scripts don't
const pageHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
});

function apiRouter() {
  const api = express.Router();
  api.use(apiHeaders);
  api.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  // every body we accept is a few ids or flags
  api.use(express.json({ limit: '20kb' }));
  api.use(cookieParser());

  api.use('/health', healthRouter);
  api.use(apiLimiter);
  api.use(loadSession);
  api.use('/auth', authLimiter, authRouter);
  api.use('/me', meRouter);
  api.use('/sync', syncRouter);
  api.use('/senders', sendersRouter);
  api.use('/analytics', analyticsRouter);

  api.use(notFoundHandler);
  return api;
}

function clientRouter(dist: string) {
  const client = express.Router();
  client.use(pageHeaders);
  // vite hashes asset names, so they can be cached for good
  client.use(
    '/assets',
    express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }),
  );
  client.use(express.static(dist, { index: false }));
  // the router lives in the browser, so every other path gets the app
  client.get('/{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
  return client;
}

interface AppOptions {
  // a built client to serve. the api then moves under /api, matching the dev proxy
  clientDist?: string;
}

export function createApp({ clientDist = env.CLIENT_DIST }: AppOptions = {}) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  if (clientDist) {
    app.use('/api', apiRouter());
    app.use(clientRouter(path.resolve(clientDist)));
  } else {
    app.use(apiRouter());
  }

  app.use(errorHandler);
  return app;
}
