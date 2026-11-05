import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/db';
import { failInterruptedSyncs } from './services/sync';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`server running on http://localhost:${env.PORT}`);
});

if (env.DATABASE_URL) {
  failInterruptedSyncs().catch((err) => console.error('could not clean up old syncs', err));
}

// hosts send SIGTERM before a redeploy. finish the requests in flight, then let go of the
// database. a sync still running is marked failed by failInterruptedSyncs on the next boot
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => {})
      .finally(() => process.exit(0));
  });
  server.closeIdleConnections();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
