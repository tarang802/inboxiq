import { prisma } from '../lib/db';
import { HttpError } from '../utils/httpError';
import { mapLimit } from '../utils/pool';
import { createGmailClient } from './gmail';
import { SenderAggregator } from './senderAggregator';
import { saveSenders } from './senderStore';

// gmail allows roughly 50 metadata reads a second per user; 8 in flight stays under it
const CONCURRENCY = 8;

// big inboxes take a long time to scan, so only look at the last year
const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 50_000;

const ACTIVE = ['QUEUED', 'RUNNING'] as const;

interface SyncUser {
  id: string;
  email: string;
}

async function runSync(runId: string, user: SyncUser) {
  try {
    await prisma.syncRun.update({ where: { id: runId }, data: { status: 'RUNNING' } });

    const gmail = createGmailClient(user.id);
    const senders = new SenderAggregator(user.email);
    const since = Date.now() - WINDOW_MS;
    let processed = 0;
    let pageToken: string | undefined;

    do {
      const page = await gmail.listMessages(pageToken);
      const messages = await mapLimit(page.ids, CONCURRENCY, (id) => gmail.getMessage(id));

      let oldest = Infinity;
      for (const msg of messages) {
        if (!msg) continue;
        oldest = Math.min(oldest, msg.internalDate);
        if (msg.internalDate >= since) senders.add(msg);
      }

      processed += page.ids.length;
      await prisma.syncRun.update({ where: { id: runId }, data: { processed } });

      // gmail lists newest first, so once a page reaches past the window we're done
      if (oldest < since || processed >= MAX_MESSAGES) break;
      pageToken = page.nextPageToken;
    } while (pageToken);

    await saveSenders(user.id, senders.values());
    await prisma.syncRun.update({
      where: { id: runId },
      data: { status: 'DONE', finishedAt: new Date() },
    });
  } catch (err) {
    console.error(`sync ${runId} failed`, err);
    await prisma.syncRun
      .update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          error: err instanceof HttpError ? err.message : 'sync failed',
          finishedAt: new Date(),
        },
      })
      .catch(() => {});
  }
}

// a crash mid-sync leaves the run RUNNING forever, which would block every new sync
const STALE_MS = 60 * 60 * 1000;

function failStaleSyncs(userId: string) {
  return prisma.syncRun.updateMany({
    where: {
      userId,
      status: { in: [...ACTIVE] },
      startedAt: { lt: new Date(Date.now() - STALE_MS) },
    },
    data: { status: 'FAILED', error: 'sync timed out', finishedAt: new Date() },
  });
}

export async function startSync(user: SyncUser) {
  await failStaleSyncs(user.id);

  const active = await prisma.syncRun.findFirst({
    where: { userId: user.id, status: { in: [...ACTIVE] } },
  });
  if (active) throw new HttpError(409, 'a sync is already running');

  const run = await prisma.syncRun.create({ data: { userId: user.id } });

  // runs in the background for now; a real queue comes later
  void runSync(run.id, user);

  return run;
}

export function latestSync(userId: string) {
  return prisma.syncRun.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      status: true,
      processed: true,
      total: true,
      error: true,
      startedAt: true,
      finishedAt: true,
    },
  });
}
