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
  const tokens = await refreshAccessToken(refreshToken);

  return { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
}
