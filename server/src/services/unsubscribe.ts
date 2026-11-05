import { request } from 'node:https';
import { assertPublicUrl, PrivateAddressError, publicLookup } from '../lib/publicUrl';
import { HttpError } from '../utils/httpError';

const TIMEOUT_MS = 10_000;
const BODY = 'List-Unsubscribe=One-Click';

// node's https rather than fetch: only it lets the socket resolve through publicLookup.
// it never follows redirects, which rfc 8058 forbids anyway
function post(url: string) {
  return new Promise<number>((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(BODY),
        },
        lookup: publicLookup,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on('error', reject);
    req.end(BODY);
  });
}

// rfc 8058 one-click: a POST with this exact body, no cookies, no auth.
// senders must not redirect it, so a redirect counts as a failure
export async function sendOneClickUnsubscribe(url: string) {
  await assertPublicUrl(url);

  let status: number;
  try {
    status = await post(url);
  } catch (err) {
    if (err instanceof PrivateAddressError) {
      throw new HttpError(400, 'unsubscribe link points at a private network');
    }
    throw new HttpError(502, 'the sender did not respond to the unsubscribe request');
  }

  if (status < 200 || status >= 300) {
    throw new HttpError(502, `the sender rejected the unsubscribe request (${status})`);
  }
}
