import { assertPublicUrl } from '../lib/publicUrl';
import { HttpError } from '../utils/httpError';

const TIMEOUT_MS = 10_000;

// rfc 8058 one-click: a POST with this exact body, no cookies, no auth.
// senders must not redirect it, so a redirect counts as a failure
export async function sendOneClickUnsubscribe(url: string) {
  await assertPublicUrl(url);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, 'the sender did not respond to the unsubscribe request');
  }

  if (res.status < 200 || res.status >= 300) {
    throw new HttpError(502, `the sender rejected the unsubscribe request (${res.status})`);
  }
}
