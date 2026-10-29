import { env } from '../config/env';
import { prisma } from '../lib/db';
import { decrypt } from '../lib/crypto';
import { HttpError } from '../utils/httpError';
import { refreshAccessToken } from './googleOAuth';

export const RECONNECT_REQUIRED = 'gmail_reconnect_required';

export interface AccessToken {
  token: string;
  expiresAt: number;
}

export async function getAccessToken(userId: string): Promise<AccessToken> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account || !account.tokenValid) throw new HttpError(401, RECONNECT_REQUIRED);

  const refreshToken = decrypt(account.encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY);

  let tokens;
  try {
    tokens = await refreshAccessToken(refreshToken);
  } catch (err) {
    // invalid_grant: access was revoked, or the testing-mode token hit its 7 day limit
    if (err instanceof HttpError && err.message.endsWith('invalid_grant')) {
      await prisma.googleAccount.update({ where: { userId }, data: { tokenValid: false } });
      throw new HttpError(401, RECONNECT_REQUIRED);
    }
    throw err;
  }

  return { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
}
