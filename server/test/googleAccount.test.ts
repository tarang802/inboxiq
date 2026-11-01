import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encrypt } from '../src/lib/crypto';
import { HttpError } from '../src/utils/httpError';
// vi.mock calls below are hoisted above these imports by vitest
import { getAccessToken, RECONNECT_REQUIRED } from '../src/services/googleAccount';

const db = vi.hoisted(() => ({
  googleAccount: { findUnique: vi.fn(), update: vi.fn() },
}));
const oauth = vi.hoisted(() => ({ refreshAccessToken: vi.fn() }));

vi.mock('../src/lib/db', () => ({ prisma: db }));
vi.mock('../src/services/googleOAuth', () => oauth);

const key = '0'.repeat(64);
const account = (overrides = {}) => ({
  userId: 'u1',
  encryptedRefreshToken: encrypt('refresh-1', key),
  tokenValid: true,
  ...overrides,
});

describe('getAccessToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trades the stored refresh token for an access token', async () => {
    db.googleAccount.findUnique.mockResolvedValue(account());
    oauth.refreshAccessToken.mockResolvedValue({ access_token: 'access-1', expires_in: 3600 });

    const token = await getAccessToken('u1');

    expect(oauth.refreshAccessToken).toHaveBeenCalledWith('refresh-1');
    expect(token.token).toBe('access-1');
    expect(token.expiresAt).toBeGreaterThan(Date.now());
  });

  it('marks the account invalid when google says the grant is dead', async () => {
    db.googleAccount.findUnique.mockResolvedValue(account());
    oauth.refreshAccessToken.mockRejectedValue(
      new HttpError(401, 'google token request failed: invalid_grant'),
    );

    await expect(getAccessToken('u1')).rejects.toMatchObject({
      status: 401,
      message: RECONNECT_REQUIRED,
    });
    expect(db.googleAccount.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { tokenValid: false },
    });
  });

  it('does not call google again once the token is known to be dead', async () => {
    db.googleAccount.findUnique.mockResolvedValue(account({ tokenValid: false }));

    await expect(getAccessToken('u1')).rejects.toMatchObject({ message: RECONNECT_REQUIRED });
    expect(oauth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('leaves the account alone for other google errors', async () => {
    db.googleAccount.findUnique.mockResolvedValue(account());
    oauth.refreshAccessToken.mockRejectedValue(new HttpError(502, 'google token request failed'));

    await expect(getAccessToken('u1')).rejects.toMatchObject({ status: 502 });
    expect(db.googleAccount.update).not.toHaveBeenCalled();
  });
});
