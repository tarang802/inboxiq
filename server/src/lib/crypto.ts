import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getKey(hexKey: string | undefined) {
  if (!hexKey || !/^[0-9a-f]{64}$/i.test(hexKey)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes of hex (64 chars)');
  }
  return Buffer.from(hexKey, 'hex');
}

// output format: iv.tag.ciphertext, all base64url
export function encrypt(plain: string, hexKey: string | undefined) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(hexKey), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string, hexKey: string | undefined) {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
  if (!iv || !tag || !data) throw new Error('malformed encrypted payload');

  const decipher = createDecipheriv(ALGO, getKey(hexKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const sha256Base64Url = (value: string) =>
  createHash('sha256').update(value).digest('base64url');
