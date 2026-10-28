import type { CookieOptions } from 'express';
import { prisma } from '../lib/db';
import { randomToken, sha256 } from '../lib/crypto';
import { env } from '../config/env';

export const SESSION_COOKIE = 'sid';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * DAY_MS,
};

// returns the raw token for the cookie; only its hash is stored
export async function createSession(userId: string) {
  const token = randomToken();

  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS),
    },
  });

  return token;
}

export async function findSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { id: sha256(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}
