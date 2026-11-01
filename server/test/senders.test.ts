import { describe, expect, it } from 'vitest';
import { clutterScore } from '../src/lib/clutter';
import type { MessageMeta } from '../src/services/gmail';
import { SenderAggregator } from '../src/services/senderAggregator';

const msg = (
  from: string,
  date: string,
  headers: Record<string, string> = {},
  labelIds = ['INBOX'],
): MessageMeta => ({
  id: Math.random().toString(36).slice(2),
  labelIds,
  internalDate: Date.parse(date),
  headers: { from, ...headers },
});

describe('SenderAggregator', () => {
  it('folds messages into one summary per address', () => {
    const agg = new SenderAggregator('me@gmail.com');
    agg.add(
      msg('Shop <deals@shop.com>', '2026-05-01', { 'list-unsubscribe': '<https://shop.com/old>' }),
    );
    agg.add(
      msg('Shop Deals <deals@shop.com>', '2026-09-01', {
        'list-unsubscribe': '<https://shop.com/new>',
        'list-unsubscribe-post': 'List-Unsubscribe=One-Click',
      }),
    );
    agg.add(msg('Shop <DEALS@shop.com>', '2026-07-01'));

    const [shop] = agg.values();
    expect(agg.size).toBe(1);
    expect(shop).toMatchObject({
      email: 'deals@shop.com',
      name: 'Shop Deals',
      count: 3,
      unsubscribeUrl: 'https://shop.com/new',
      oneClick: true,
    });
    expect(shop.firstSeen.toISOString().slice(0, 10)).toBe('2026-05-01');
    expect(shop.lastSeen.toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('keeps older unsubscribe info when newer mail has none', () => {
    const agg = new SenderAggregator('me@gmail.com');
    agg.add(msg('a@news.com', '2026-01-01', { 'list-unsubscribe': '<mailto:stop@news.com>' }));
    agg.add(msg('a@news.com', '2026-02-01'));
    expect(agg.values()[0].unsubscribeMail).toBe('mailto:stop@news.com');
  });

  it('skips the user, sent mail and drafts', () => {
    const agg = new SenderAggregator('Me@Gmail.com');
    expect(agg.add(msg('me@gmail.com', '2026-07-01'))).toBe(false);
    expect(agg.add(msg('x@y.com', '2026-07-01', {}, ['SENT']))).toBe(false);
    expect(agg.add(msg('x@y.com', '2026-07-01', {}, ['DRAFT']))).toBe(false);
    expect(agg.size).toBe(0);
  });
});

describe('clutterScore', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  const daysAgo = (d: number) => new Date(now - d * 86_400_000);
  const base = { unsubscribeUrl: null, unsubscribeMail: null, oneClick: false };

  it('maxes out for a busy one-click newsletter', () => {
    const score = clutterScore(
      { ...base, count: 300, lastSeen: daysAgo(1), unsubscribeUrl: 'https://x', oneClick: true },
      now,
    );
    expect(score).toBe(100);
  });

  it('ranks a quiet friend below an old promo list', () => {
    const friend = clutterScore({ ...base, count: 3, lastSeen: daysAgo(40) }, now);
    const promo = clutterScore(
      { ...base, count: 50, lastSeen: daysAgo(200), unsubscribeMail: 'mailto:x' },
      now,
    );
    expect(friend).toBeLessThan(promo);
    expect(friend).toBeLessThan(40);
  });

  it('stays within 0-100 for future dates', () => {
    const score = clutterScore({ ...base, count: 1, lastSeen: daysAgo(-5) }, now);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
