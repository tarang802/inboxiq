import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // only the prisma cli reads this; the app connects through the adapter in src/lib/db.ts.
    // migrations take a session lock, which a pooled url (neon's -pooler host) may not
    // hold, so DIRECT_URL can point them at the direct host instead
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
