import { prisma } from '../lib/db';
import type { Prisma, SenderStatus } from '../generated/prisma/client';
import { notFound } from '../utils/httpError';

// everything the dashboard needs; userId and timestamps stay server side
export const senderSelect = {
  id: true,
  email: true,
  name: true,
  domain: true,
  messageCount: true,
  firstSeenAt: true,
  lastSeenAt: true,
  unsubscribeUrl: true,
  unsubscribeMail: true,
  oneClick: true,
  status: true,
  clutterScore: true,
} satisfies Prisma.SenderSelect;

export const SORTS = {
  clutter: 'clutterScore',
  count: 'messageCount',
  recent: 'lastSeenAt',
  name: 'email',
} as const;

export type SenderSort = keyof typeof SORTS;

export interface SenderQuery {
  q?: string;
  status?: SenderStatus;
  // only senders we can unsubscribe from
  unsubscribable?: boolean;
  sort: SenderSort;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export async function listSenders(userId: string, query: SenderQuery) {
  const { q, status, unsubscribable, sort, order, page, pageSize } = query;
  const where: Prisma.SenderWhereInput = { userId };

  if (status) where.status = status;
  if (unsubscribable) {
    where.AND = [{ OR: [{ unsubscribeUrl: { not: null } }, { unsubscribeMail: { not: null } }] }];
  }

  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { domain: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [senders, total] = await prisma.$transaction([
    prisma.sender.findMany({
      where,
      select: senderSelect,
      // id breaks ties so rows don't jump between pages
      orderBy: [{ [SORTS[sort]]: order }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sender.count({ where }),
  ]);

  return { senders, total, page, pageSize };
}

// scoped by userId so one user can never touch another user's sender
export async function setSenderStatus(userId: string, id: string, status: SenderStatus) {
  const { count } = await prisma.sender.updateMany({ where: { id, userId }, data: { status } });
  if (!count) throw notFound('sender not found');

  return prisma.sender.findUniqueOrThrow({ where: { id }, select: senderSelect });
}
