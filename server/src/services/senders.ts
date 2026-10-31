import { prisma } from '../lib/db';
import type { Prisma } from '../generated/prisma/client';

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

export interface SenderQuery {
  q?: string;
  page: number;
  pageSize: number;
}

export async function listSenders(userId: string, query: SenderQuery) {
  const { q, page, pageSize } = query;
  const where: Prisma.SenderWhereInput = { userId };

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
      orderBy: { messageCount: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sender.count({ where }),
  ]);

  return { senders, total, page, pageSize };
}
