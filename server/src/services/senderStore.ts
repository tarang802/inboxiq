import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/db';
import { clutterScore } from '../lib/clutter';
import type { SenderAggregate } from './senderAggregator';

// 13 params a row keeps a chunk well under postgres's 65k parameter limit
const CHUNK_SIZE = 500;

// stored as utc, whatever timezone the db session is in
const utc = (date: Date) => Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

function row(userId: string, s: SenderAggregate) {
  return Prisma.sql`(
    ${randomUUID().replace(/-/g, '')}, ${userId}, ${s.email}, ${s.name}::text, ${s.domain},
    ${s.count}::int, ${utc(s.firstSeen)}, ${utc(s.lastSeen)},
    ${s.unsubscribeUrl}::text, ${s.unsubscribeMail}::text, ${s.oneClick}::boolean,
    ${clutterScore(s)}::int, (now() AT TIME ZONE 'UTC')
  )`;
}

// each sync rescans the whole window, so counts are replaced, not added to.
// status is left alone so keep/ignore choices survive a resync.
// one statement per chunk: an upsert per sender is a round trip each,
// and a big inbox blew through prisma's transaction timeout
export async function saveSenders(userId: string, senders: SenderAggregate[]) {
  for (let i = 0; i < senders.length; i += CHUNK_SIZE) {
    const chunk = senders.slice(i, i + CHUNK_SIZE);

    await prisma.$executeRaw`
      INSERT INTO "Sender" (
        "id", "userId", "email", "name", "domain",
        "messageCount", "firstSeenAt", "lastSeenAt",
        "unsubscribeUrl", "unsubscribeMail", "oneClick",
        "clutterScore", "updatedAt"
      )
      VALUES ${Prisma.join(chunk.map((s) => row(userId, s)))}
      ON CONFLICT ("userId", "email") DO UPDATE SET
        "name" = EXCLUDED."name",
        "domain" = EXCLUDED."domain",
        "messageCount" = EXCLUDED."messageCount",
        "firstSeenAt" = EXCLUDED."firstSeenAt",
        "lastSeenAt" = EXCLUDED."lastSeenAt",
        "unsubscribeUrl" = EXCLUDED."unsubscribeUrl",
        "unsubscribeMail" = EXCLUDED."unsubscribeMail",
        "oneClick" = EXCLUDED."oneClick",
        "clutterScore" = EXCLUDED."clutterScore",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
}
