import { prisma } from '../lib/db';
import { parseFrom } from '../lib/headers';
import { HttpError } from '../utils/httpError';
import { JobQueue } from '../utils/jobQueue';
import { mapLimit } from '../utils/pool';
import { createGmailClient, type GmailClient, type MessageMeta } from './gmail';
import { SenderAggregator } from './senderAggregator';
import { loadSenders, saveSenders } from './senderStore';

// google bills a metadata read at about 20 units against a 6000/min per-user quota,
// so a scan tops out near 5 emails a second no matter how many are in flight
const CONCURRENCY = 16;

// a small first page gets something on screen quickly
const FIRST_PAGE_SIZE = 100;
const PAGE_SIZE = 500;

// big inboxes take a long time to scan, so only look at the last year
const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 50_000;

// between full scans a sync only reads new mail. a weekly full scan lets old mail
// age out of the window and refreshes recency scores, and gmail drops history
// older than about a week anyway
const FULL_SCAN_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

const ACTIVE = ['QUEUED', 'RUNNING'] as const;

// gmail limits are per user, but the db and this process are shared.
// two syncs at a time keeps one big inbox from starving everyone else
const SYNC_WORKERS = 2;
const queue = new JobQueue(SYNC_WORKERS);

interface SyncUser {
  id: string;
  email: string;
}

function setProcessed(runId: string, processed: number) {
  return prisma.syncRun.update({ where: { id: runId }, data: { processed } });
}

// reads the last year of mail page by page. returns where the next sync can pick up
async function fullScan(runId: string, user: SyncUser, gmail: GmailClient) {
  // taken before the scan, so mail that lands mid-scan is caught next time.
  // the price is that mail arriving in the second before the first page can count twice
  const historyId = await gmail.getHistoryId();

  const senders = new SenderAggregator(user.email);
  const since = Date.now() - WINDOW_MS;
  const firstSync = (await prisma.sender.count({ where: { userId: user.id } })) === 0;
  let processed = 0;
  let pageToken: string | undefined;

  do {
    const page = await gmail.listMessages(pageToken, pageToken ? PAGE_SIZE : FIRST_PAGE_SIZE);
    const messages = await mapLimit(page.ids, CONCURRENCY, (id) => gmail.getMessage(id));

    let oldest = Infinity;
    for (const msg of messages) {
      if (!msg) continue;
      oldest = Math.min(oldest, msg.internalDate);
      if (msg.internalDate >= since) senders.add(msg);
    }

    // a first sync has nothing to show, so publish senders as they come in.
    // a resync leaves the old counts up until the new ones are complete
    if (firstSync) await saveSenders(user.id, senders.values());

    processed += page.ids.length;
    await setProcessed(runId, processed);

    // gmail lists newest first, so once a page reaches past the window we're done
    if (oldest < since || processed >= MAX_MESSAGES) break;
    pageToken = page.nextPageToken;
  } while (pageToken);

  await saveSenders(user.id, senders.values());
  return historyId;
}

// reads only mail added since the last sync and adds it to the saved totals.
// returns null when gmail no longer has history that far back
async function catchUp(runId: string, user: SyncUser, gmail: GmailClient, startHistoryId: string) {
  const ids = new Set<string>();
  let historyId = startHistoryId;
  let pageToken: string | undefined;

  do {
    const page = await gmail.listNewMessages(startHistoryId, pageToken);
    if (!page) return null;
    for (const id of page.ids) ids.add(id);
    historyId = page.historyId ?? historyId;
    pageToken = page.nextPageToken;
  } while (pageToken);

  const fetched = await mapLimit([...ids], CONCURRENCY, (id) => gmail.getMessage(id));
  const messages = fetched.filter((msg): msg is MessageMeta => msg !== null);

  const emails = new Set<string>();
  for (const msg of messages) {
    const email = parseFrom(msg.headers.from)?.email;
    if (email) emails.add(email);
  }

  const senders = new SenderAggregator(user.email);
  senders.seed(await loadSenders(user.id, [...emails]));
  for (const msg of messages) senders.add(msg);

  await saveSenders(user.id, senders.values());
  await setProcessed(runId, ids.size);
  return historyId;
}

async function runSync(runId: string, user: SyncUser) {
  try {
    await prisma.syncRun.update({ where: { id: runId }, data: { status: 'RUNNING' } });

    const gmail = createGmailClient(user.id);
    const account = await prisma.googleAccount.findUnique({
      where: { userId: user.id },
      select: { historyId: true, fullSyncAt: true },
    });

    const recentFullScan =
      account?.fullSyncAt && Date.now() - account.fullSyncAt.getTime() < FULL_SCAN_EVERY_MS;
    const caughtUp =
      recentFullScan && account.historyId
        ? await catchUp(runId, user, gmail, account.historyId)
        : null;

    if (caughtUp) {
      await prisma.googleAccount.update({
        where: { userId: user.id },
        data: { historyId: caughtUp },
      });
    } else {
      const historyId = await fullScan(runId, user, gmail);
      await prisma.googleAccount.update({
        where: { userId: user.id },
        data: { historyId, fullSyncAt: new Date() },
      });
    }

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

// syncs run in this process, so any left active at boot died with the last one
export function failInterruptedSyncs() {
  return prisma.syncRun.updateMany({
    where: { status: { in: [...ACTIVE] } },
    data: { status: 'FAILED', error: 'interrupted by a server restart', finishedAt: new Date() },
  });
}

export async function startSync(user: SyncUser) {
  await failStaleSyncs(user.id);

  const active = await prisma.syncRun.findFirst({
    where: { userId: user.id, status: { in: [...ACTIVE] } },
  });
  if (active) throw new HttpError(409, 'a sync is already running');

  const run = await prisma.syncRun.create({ data: { userId: user.id } });
  queue.add(user.id, () => runSync(run.id, user));

  return run;
}

// used when an account is deleted, so a waiting sync never starts for it
export function cancelQueuedSync(userId: string) {
  return queue.cancel(userId);
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
