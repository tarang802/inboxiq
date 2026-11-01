import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageMeta } from '../src/services/gmail';
import { startSync } from '../src/services/sync';

const { db, gmail, store } = vi.hoisted(() => ({
  db: {
    syncRun: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    sender: { count: vi.fn() },
    googleAccount: { findUnique: vi.fn(), update: vi.fn() },
  },
  gmail: {
    getHistoryId: vi.fn(),
    listNewMessages: vi.fn(),
    listMessages: vi.fn(),
    getMessage: vi.fn(),
  },
  store: { loadSenders: vi.fn(), saveSenders: vi.fn() },
}));

vi.mock('../src/lib/db', () => ({ prisma: db }));
vi.mock('../src/services/gmail', () => ({ createGmailClient: () => gmail }));
vi.mock('../src/services/senderStore', () => store);

const user = { id: 'u1', email: 'me@example.test' };
const DAY_MS = 24 * 60 * 60 * 1000;

const meta = (id: string, from = 'News <news@shop.test>'): MessageMeta => ({
  id,
  labelIds: ['INBOX'],
  internalDate: Date.now() - DAY_MS,
  headers: { from },
});

async function sync() {
  await startSync(user);
  await vi.waitFor(() => {
    const finished = db.syncRun.update.mock.calls.find(([arg]) => arg.data.finishedAt);
    expect(finished).toBeDefined();
  });
  return db.syncRun.update.mock.calls.find(([arg]) => arg.data.finishedAt)![0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.syncRun.findFirst.mockResolvedValue(null);
  db.syncRun.create.mockResolvedValue({ id: 'run1' });
  db.sender.count.mockResolvedValue(3);
  gmail.getHistoryId.mockResolvedValue('900');
  gmail.getMessage.mockImplementation(async (id: string) => meta(id));
  gmail.listMessages.mockResolvedValue({ ids: ['m1', 'm2'] });
  store.loadSenders.mockResolvedValue([]);
});

describe('sync', () => {
  it('only reads new mail after a recent full scan', async () => {
    db.googleAccount.findUnique.mockResolvedValue({
      historyId: '500',
      fullSyncAt: new Date(Date.now() - DAY_MS),
    });
    gmail.listNewMessages.mockResolvedValue({ ids: ['n1', 'n2', 'n1'], historyId: '640' });
    store.loadSenders.mockResolvedValue([
      {
        email: 'news@shop.test',
        name: 'News',
        domain: 'shop.test',
        count: 10,
        firstSeen: new Date('2026-01-01'),
        lastSeen: new Date('2026-06-01'),
        unsubscribeUrl: null,
        unsubscribeMail: null,
        oneClick: false,
      },
    ]);

    const done = await sync();

    expect(done.status).toBe('DONE');
    expect(gmail.listNewMessages).toHaveBeenCalledWith('500', undefined);
    expect(gmail.listMessages).not.toHaveBeenCalled();
    expect(gmail.getMessage).toHaveBeenCalledTimes(2);

    const [, saved] = store.saveSenders.mock.calls[0];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ email: 'news@shop.test', count: 12 });
    expect(saved[0].firstSeen).toEqual(new Date('2026-01-01'));

    expect(db.googleAccount.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { historyId: '640' },
    });
  });

  it('falls back to a full scan when gmail no longer has the history', async () => {
    db.googleAccount.findUnique.mockResolvedValue({
      historyId: '500',
      fullSyncAt: new Date(Date.now() - DAY_MS),
    });
    gmail.listNewMessages.mockResolvedValue(null);

    const done = await sync();

    expect(done.status).toBe('DONE');
    expect(gmail.listMessages).toHaveBeenCalled();
    const { data } = db.googleAccount.update.mock.calls[0][0];
    expect(data.historyId).toBe('900');
    expect(data.fullSyncAt).toBeInstanceOf(Date);
  });

  it('does a full scan once the last one is a week old', async () => {
    db.googleAccount.findUnique.mockResolvedValue({
      historyId: '500',
      fullSyncAt: new Date(Date.now() - 8 * DAY_MS),
    });

    await sync();

    expect(gmail.listNewMessages).not.toHaveBeenCalled();
    expect(gmail.listMessages).toHaveBeenCalled();
  });

  it('saves after every page on a first sync', async () => {
    db.googleAccount.findUnique.mockResolvedValue({ historyId: null, fullSyncAt: null });
    db.sender.count.mockResolvedValue(0);
    gmail.listMessages
      .mockResolvedValueOnce({ ids: ['m1'], nextPageToken: 'p2' })
      .mockResolvedValueOnce({ ids: ['m2'] });

    await sync();

    expect(gmail.listMessages).toHaveBeenNthCalledWith(1, undefined, 100);
    expect(gmail.listMessages).toHaveBeenNthCalledWith(2, 'p2', 500);
    // once per page, then the final save
    expect(store.saveSenders).toHaveBeenCalledTimes(3);
  });
});
