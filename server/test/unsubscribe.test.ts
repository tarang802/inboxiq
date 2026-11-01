import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPublicUrl } from '../src/lib/publicUrl';
import { sendOneClickUnsubscribe } from '../src/services/unsubscribe';

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

describe('sendOneClickUnsubscribe', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the exact rfc 8058 request without following redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendOneClickUnsubscribe(PUBLIC);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(PUBLIC);
    expect(init).toMatchObject({
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('treats a redirect as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302 })));
    await expect(sendOneClickUnsubscribe(PUBLIC)).rejects.toMatchObject({ status: 502 });
  });

  it('reports a sender that does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    await expect(sendOneClickUnsubscribe(PUBLIC)).rejects.toMatchObject({ status: 502 });
  });

  it('never contacts a private address', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendOneClickUnsubscribe('https://10.0.0.1/u')).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
