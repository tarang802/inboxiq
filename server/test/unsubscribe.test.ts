import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertPublicUrl, PrivateAddressError, publicLookup } from '../src/lib/publicUrl';
import { sendOneClickUnsubscribe } from '../src/services/unsubscribe';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('node:https', () => ({ request }));

// a public ip literal, so no dns lookup happens during tests
const PUBLIC = 'https://93.184.215.14/u?id=1';

async function statusOf(url: string) {
  try {
    await assertPublicUrl(url);
    return 'ok';
  } catch (err) {
    return (err as { status: number }).status;
  }
}

describe('assertPublicUrl', () => {
  it.each([
    'http://example.com/u',
    'https://127.0.0.1/u',
    'https://10.1.2.3/u',
    'https://172.20.0.1/u',
    'https://192.168.1.1/u',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/u',
    'https://[::ffff:127.0.0.1]/u',
    'https://[fd00::1]/u',
    'https://localhost/u',
    'https://user:pw@example.com/u',
    'javascript:alert(1)',
    'not a url',
  ])('refuses %s', async (url) => {
    expect(await statusOf(url)).toBe(400);
  });

  it('allows a public https address', async () => {
    expect(await statusOf(PUBLIC)).toBe('ok');
  });
});

// a fake request that answers with a status, or fails, once the body is sent
function respond(status: number | Error) {
  request.mockImplementation((_url, _opts, onResponse) => {
    const req = Object.assign(new EventEmitter(), {
      end: vi.fn(() => {
        if (status instanceof Error) queueMicrotask(() => req.emit('error', status));
        else onResponse({ statusCode: status, resume: vi.fn() });
      }),
    });
    return req;
  });
}

describe('sendOneClickUnsubscribe', () => {
  beforeEach(() => request.mockReset());

  it('sends the exact rfc 8058 request, resolving through the public-only lookup', async () => {
    respond(200);
    await sendOneClickUnsubscribe(PUBLIC);

    const [url, opts] = request.mock.calls[0];
    expect(url).toBe(PUBLIC);
    expect(opts).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      lookup: publicLookup,
    });
    const req = request.mock.results[0].value;
    expect(req.end).toHaveBeenCalledWith('List-Unsubscribe=One-Click');
  });

  it('treats a redirect as a failure', async () => {
    respond(302);
    await expect(sendOneClickUnsubscribe(PUBLIC)).rejects.toMatchObject({ status: 502 });
  });

  it('reports a sender that does not answer', async () => {
    respond(new Error('socket hang up'));
    await expect(sendOneClickUnsubscribe(PUBLIC)).rejects.toMatchObject({ status: 502 });
  });

  it('refuses when the host turns private by the time it connects', async () => {
    respond(new PrivateAddressError('rebind.example'));
    await expect(sendOneClickUnsubscribe(PUBLIC)).rejects.toMatchObject({ status: 400 });
  });

  it('never contacts a private address', async () => {
    await expect(sendOneClickUnsubscribe('https://10.0.0.1/u')).rejects.toMatchObject({
      status: 400,
    });
    expect(request).not.toHaveBeenCalled();
  });
});
