const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClutterInput {
  count: number;
  lastSeen: Date;
  unsubscribeUrl: string | null;
  unsubscribeMail: string | null;
  oneClick: boolean;
}

// 0-100, higher means more worth cleaning up.
// volume 50, recency 30, bulk-mail signal 20
export function clutterScore(s: ClutterInput, now = Date.now()) {
  // log scale so 200 mails isn't 20x worse than 10. 200+ maxes out
  const volume = Math.min(1, Math.log10(s.count + 1) / Math.log10(201));

  // full marks inside a week, fades to nothing at six months
  const daysAgo = Math.max(0, (now - s.lastSeen.getTime()) / DAY_MS);
  const recency = daysAgo <= 7 ? 1 : Math.max(0, 1 - (daysAgo - 7) / 173);

  // an unsubscribe header almost always means newsletters or marketing
  let bulk = 0;
  if (s.oneClick) bulk = 1;
  else if (s.unsubscribeUrl || s.unsubscribeMail) bulk = 0.75;

  return Math.round(volume * 50 + recency * 30 + bulk * 20);
}
