import { env } from '../config/env';
import { decrypt } from '../lib/crypto';
import { prisma } from '../lib/db';
import { revokeToken } from './googleOAuth';
import { cancelQueuedSync } from './sync';

// removes the user and, through cascades, their sessions, google account, senders and syncs.
// google access is revoked first, but a failure there never blocks the delete
export async function deleteAccount(userId: string) {
  cancelQueuedSync(userId);

  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (account) {
    try {
      await revokeToken(decrypt(account.encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY));
    } catch (err) {
      console.error('could not revoke google token during account delete', err);
    }
  }

  await prisma.user.delete({ where: { id: userId } });
}
