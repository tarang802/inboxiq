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

const hasUnsubscribe: Prisma.SenderWhereInput = {
  OR: [{ unsubscribeUrl: { not: null } }, { unsubscribeMail: { not: null } }],
};

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
    // AND so it doesn't clash with the search OR below
    where.AND = [hasUnsubscribe];
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

export async function senderSummary(userId: string) {
  const where = { userId };

  const [totals, unsubscribable, oneClick, byStatus] = await prisma.$transaction([
    prisma.sender.aggregate({ where, _count: true, _sum: { messageCount: true } }),
    prisma.sender.count({ where: { ...where, ...hasUnsubscribe } }),
    prisma.sender.count({ where: { ...where, oneClick: true } }),
    prisma.sender.groupBy({ by: ['status'], where, _count: true, orderBy: { status: 'asc' } }),
  ]);

  const statuses: Record<SenderStatus, number> = {
    ACTIVE: 0,
    KEPT: 0,
    IGNORED: 0,
    UNSUBSCRIBED: 0,
  };
  for (const row of byStatus) statuses[row.status] = row._count as number;

  return {
    senders: totals._count,
    messages: totals._sum.messageCount ?? 0,
    unsubscribable,
    oneClick,
    statuses,
  };
}
