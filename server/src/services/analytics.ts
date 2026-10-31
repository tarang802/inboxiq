import { prisma } from '../lib/db';

const TOP = 10;

export async function analyticsSummary(userId: string) {
  const where = { userId };

  const [topSenders, topDomains, oneClick, link, mail, none, unsubscribed] =
    await prisma.$transaction([
      prisma.sender.findMany({
        where,
        orderBy: [{ messageCount: 'desc' }, { id: 'asc' }],
        take: TOP,
        select: { id: true, email: true, name: true, messageCount: true, status: true },
      }),
      prisma.sender.groupBy({
        by: ['domain'],
        where,
        _sum: { messageCount: true },
        _count: { _all: true },
        orderBy: { _sum: { messageCount: 'desc' } },
        take: TOP,
      }),
      // the four unsubscribe buckets don't overlap, so they add up to all senders
      prisma.sender.count({ where: { ...where, oneClick: true } }),
      prisma.sender.count({ where: { ...where, oneClick: false, unsubscribeUrl: { not: null } } }),
      prisma.sender.count({
        where: { ...where, unsubscribeUrl: null, unsubscribeMail: { not: null } },
      }),
      prisma.sender.count({ where: { ...where, unsubscribeUrl: null, unsubscribeMail: null } }),
      prisma.sender.aggregate({
        where: { ...where, status: 'UNSUBSCRIBED' },
        _count: true,
        _sum: { messageCount: true },
      }),
    ]);

  return {
    topSenders,
    topDomains: topDomains.map((d) => ({
      domain: d.domain,
      messages: d._sum?.messageCount ?? 0,
      senders: d._count?._all ?? 0,
    })),
    unsubscribe: { oneClick, link, mail, none },
    // last year's volume from senders you've left, a rough guess at mail you won't get
    unsubscribed: {
      senders: unsubscribed._count,
      emailsPerYear: unsubscribed._sum.messageCount ?? 0,
    },
  };
}
