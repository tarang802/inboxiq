import { prisma } from '../lib/db';
import { clutterScore } from '../lib/clutter';
import type { SenderAggregate } from './senderAggregator';

const CHUNK_SIZE = 100;

// each sync rescans the whole window, so counts are replaced, not added to.
// status is left alone so keep/ignore choices survive a resync
export async function saveSenders(userId: string, senders: SenderAggregate[]) {
  for (let i = 0; i < senders.length; i += CHUNK_SIZE) {
    const chunk = senders.slice(i, i + CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((s) => {
        const data = {
          name: s.name,
          domain: s.domain,
          messageCount: s.count,
          firstSeenAt: s.firstSeen,
          lastSeenAt: s.lastSeen,
          unsubscribeUrl: s.unsubscribeUrl,
          unsubscribeMail: s.unsubscribeMail,
          oneClick: s.oneClick,
          clutterScore: clutterScore(s),
        };

        return prisma.sender.upsert({
          where: { userId_email: { userId, email: s.email } },
          update: data,
          create: { userId, email: s.email, ...data },
        });
      }),
    );
  }
}
