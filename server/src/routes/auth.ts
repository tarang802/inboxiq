import { Router, type CookieOptions } from 'express';
import { env } from '../config/env';
import { GMAIL_METADATA_SCOPE } from '../config/google';
import { prisma } from '../lib/db';
import { encrypt, randomToken, sha256Base64Url } from '../lib/crypto';
import { buildAuthUrl, exchangeCode, fetchProfile } from '../services/googleOAuth';
import {
  SESSION_COOKIE,
  createSession,
  deleteSession,
  sessionCookieOptions,
} from '../services/session';

const router = Router();

const STATE_COOKIE = 'oauth_state';
const VERIFIER_COOKIE = 'oauth_verifier';

const tempCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: 10 * 60 * 1000,
};

const backToClient = (error?: string) =>
  error ? `${env.CLIENT_URL}/?error=${encodeURIComponent(error)}` : `${env.CLIENT_URL}/dashboard`;

router.get('/google', (_req, res) => {
  const state = randomToken(16);
  const verifier = randomToken(32);

  res.cookie(STATE_COOKIE, state, tempCookie);
  res.cookie(VERIFIER_COOKIE, verifier, tempCookie);
  res.redirect(buildAuthUrl(state, sha256Base64Url(verifier)));
});

router.get('/google/callback', async (req, res, next) => {
  const { code, state, error } = req.query;
  const savedState = req.cookies?.[STATE_COOKIE];
  const verifier = req.cookies?.[VERIFIER_COOKIE];

  res.clearCookie(STATE_COOKIE, { path: '/' });
  res.clearCookie(VERIFIER_COOKIE, { path: '/' });

  // user hit cancel on the consent screen
  if (error) return res.redirect(backToClient('access_denied'));

  if (typeof code !== 'string' || typeof state !== 'string' || !savedState || !verifier) {
    return res.redirect(backToClient('invalid_request'));
  }

  if (state !== savedState) return res.redirect(backToClient('state_mismatch'));

  try {
    const tokens = await exchangeCode(code, verifier);

    // google lets people untick scopes on the consent screen
    if (!tokens.scope.split(' ').includes(GMAIL_METADATA_SCOPE)) {
      return res.redirect(backToClient('gmail_permission_missing'));
    }

    const profile = await fetchProfile(tokens.access_token);
    if (!profile.email) return res.redirect(backToClient('no_email'));

    const user = await prisma.user.upsert({
      where: { googleId: profile.sub },
      update: { email: profile.email, name: profile.name, picture: profile.picture },
      create: {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
    });

    if (tokens.refresh_token) {
      const encryptedRefreshToken = encrypt(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY);
      await prisma.googleAccount.upsert({
        where: { userId: user.id },
        update: { encryptedRefreshToken, scopes: tokens.scope, tokenValid: true },
        create: { userId: user.id, encryptedRefreshToken, scopes: tokens.scope },
      });
    } else {
      const existing = await prisma.googleAccount.findUnique({ where: { userId: user.id } });
      if (!existing) return res.redirect(backToClient('no_refresh_token'));
    }

    const sessionToken = await createSession(user.id);
    res.cookie(SESSION_COOKIE, sessionToken, sessionCookieOptions);
    res.redirect(backToClient());
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
