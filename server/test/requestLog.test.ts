import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requestLog } from '../src/middleware/requestLog';

function appWithLog(lines: string[]) {
  const app = express();
  app.use(requestLog({ write: (line) => lines.push(line) }));
  app.use('/api', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('requestLog', () => {
  it('logs the path without the query string', async () => {
    const lines: string[] = [];
    await request(appWithLog(lines)).get('/api/auth/google/callback?code=4/secret-code&state=abc');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^GET \/api\/auth\/google\/callback 200 /);
    expect(lines[0]).not.toContain('secret-code');
    expect(lines[0]).not.toContain('state');
  });

  it('keeps the full mounted path', async () => {
    const lines: string[] = [];
    await request(appWithLog(lines)).get('/api/senders?q=bank');
    expect(lines[0]).toMatch(/^GET \/api\/senders 200 /);
  });
});
