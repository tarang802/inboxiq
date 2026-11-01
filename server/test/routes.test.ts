import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';

// a valid cookie is any value when this returns a user; no cookie means signed out
const session = vi.hoisted(() => ({ findSession: vi.fn() }));

vi.mock('../src/services/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/session')>()),
  findSession: session.findSession,
}));

const app = createApp();
const signedIn = { cookie: 'sid=test-session' };

beforeEach(() => {
  session.findSession.mockReset();
  session.findSession.mockResolvedValue({
    user: { id: 'u1', email: 'me@gmail.com', name: 'Me', picture: null },
  });
});

describe('signed out', () => {
  it.each([
    ['get', '/me'],
    ['delete', '/me'],
    ['post', '/sync'],
    ['get', '/sync/status'],
    ['get', '/senders'],
    ['get', '/senders/summary'],
    ['patch', '/senders/abc'],
    ['post', '/senders/abc/unsubscribe'],
    ['post', '/senders/bulk'],
    ['get', '/analytics/summary'],
  ] as const)('%s %s needs a session', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'please sign in' });
  });

  it('sends unknown routes a json 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });

  it('bounces sign-in back with an error when google is not configured', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\?error=not_configured$/);
  });

  it('rejects a callback whose state does not match', async () => {
    const res = await request(app)
      .get('/auth/google/callback?code=x&state=wrong')
      .set('Cookie', 'oauth_state=right; oauth_verifier=v');
    expect(res.headers.location).toMatch(/\?error=state_mismatch$/);
  });
});

describe('security headers', () => {
  it('locks down api responses', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('input validation', () => {
  it('rejects malformed json', async () => {
    const res = await request(app)
      .post('/senders/bulk')
      .set(signedIn)
      .set('Content-Type', 'application/json')
      .send('{"ids": [');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('request body is not valid json');
  });

  it('rejects oversized bodies', async () => {
    const res = await request(app)
      .post('/senders/bulk')
      .set(signedIn)
      .send({ ids: ['a'.repeat(30_000)], action: 'keep' });
    expect(res.status).toBe(413);
  });

  it('rejects bad sender ids', async () => {
    const res = await request(app)
      .patch('/senders/..%2Fetc')
      .set(signedIn)
      .send({ status: 'KEPT' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid sender id/);
  });

  it('only allows manual statuses through PATCH', async () => {
    const res = await request(app)
      .patch('/senders/abc123')
      .set(signedIn)
      .send({ status: 'UNSUBSCRIBED' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown bulk actions and empty id lists', async () => {
    const bad = await request(app)
      .post('/senders/bulk')
      .set(signedIn)
      .send({ ids: ['abc'], action: 'delete' });
    const empty = await request(app)
      .post('/senders/bulk')
      .set(signedIn)
      .send({ ids: [], action: 'keep' });
    expect(bad.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it('rejects bad list queries', async () => {
    const res = await request(app).get('/senders?pageSize=500').set(signedIn);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pageSize/);
  });
});
