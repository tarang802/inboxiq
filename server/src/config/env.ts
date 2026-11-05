import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  // how many proxies sit in front of the app, so rate limits see the real client ip
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // path to client/dist. when set, this server also serves the app and the api moves under /api
  CLIENT_DIST: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  // per-user gmail quota from google cloud > gmail api > quotas. new projects get 6000
  GMAIL_UNITS_PER_MINUTE: z.coerce.number().int().min(100).default(6000),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

// locally the server boots with missing settings so parts of it can run.
// in production a missing one would only show up when a user hits it, so check up front.
// messages name the variable, never its value
export function productionProblems(e: Env, exists: (p: string) => boolean = existsSync) {
  const problems: string[] = [];

  for (const key of ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const) {
    if (!e[key]) problems.push(`${key} is not set`);
  }
  if (!e.TOKEN_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(e.TOKEN_ENCRYPTION_KEY)) {
    problems.push('TOKEN_ENCRYPTION_KEY must be 64 hex characters');
  }

  const client = new URL(e.CLIENT_URL);
  if (client.protocol !== 'https:') problems.push('CLIENT_URL must use https');

  if (!e.GOOGLE_REDIRECT_URI) {
    problems.push('GOOGLE_REDIRECT_URI is not set');
  } else if (e.CLIENT_DIST) {
    const expected = `${client.origin}/api/auth/google/callback`;
    if (e.GOOGLE_REDIRECT_URI !== expected) {
      problems.push(`GOOGLE_REDIRECT_URI should be ${expected}`);
    }
  }

  if (e.CLIENT_DIST && !exists(path.join(path.resolve(e.CLIENT_DIST), 'index.html'))) {
    problems.push('CLIENT_DIST has no index.html. was the client built?');
  }

  return problems;
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  const problems = productionProblems(parsed.data);
  if (problems.length) {
    console.error(`not starting, the production config has problems:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
}

export const env = parsed.data;
