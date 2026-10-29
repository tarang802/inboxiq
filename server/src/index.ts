import { createApp } from './app';
import { env } from './config/env';
import { failInterruptedSyncs } from './services/sync';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`server running on http://localhost:${env.PORT}`);
});

if (env.DATABASE_URL) {
  failInterruptedSyncs().catch((err) => console.error('could not clean up old syncs', err));
}
