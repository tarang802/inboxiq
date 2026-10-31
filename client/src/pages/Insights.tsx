import { useEffect, useState } from 'react';
import BarList from '../components/BarList';
import { getAnalytics } from '../lib/analytics';
import { formatCount } from '../lib/format';
import type { Analytics } from '../lib/types';

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function Insights() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err instanceof Error ? err.message : 'could not load insights'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!analytics) return <p className="py-12 text-center text-sm text-slate-500">Loading…</p>;

  const { topSenders, topDomains, unsubscribe, unsubscribed } = analytics;
  const totalSenders =
    unsubscribe.oneClick + unsubscribe.link + unsubscribe.mail + unsubscribe.none;
  const canLeave = totalSenders - unsubscribe.none;
  const share = (n: number) => (totalSenders ? `${Math.round((n / totalSenders) * 100)}%` : '');

  return (
    <div>
      <h1 className="text-2xl font-semibold">Insights</h1>
      <p className="mt-2 text-slate-600">Where your mail comes from over the last year.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Unsubscribed"
          value={formatCount(unsubscribed.senders)}
          hint="senders you've left"
        />
        <Stat
          label="Emails you won't get"
          value={`~${formatCount(unsubscribed.emailsPerYear)}`}
          hint="a year, based on what they sent you last year"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarList
          title="Top senders"
          unit="emails"
          empty="Run a sync to see your top senders."
          items={topSenders.map((s) => ({
            key: s.id,
            label: s.name ?? s.email,
            sublabel: s.name ? s.email : undefined,
            value: s.messageCount,
          }))}
        />
        <BarList
          title="Top domains"
          unit="emails"
          empty="Run a sync to see your top domains."
          items={topDomains.map((d) => ({
            key: d.domain,
            label: d.domain,
            value: d.messages,
            detail: `${d.senders} ${d.senders === 1 ? 'sender' : 'senders'}`,
          }))}
        />
        <BarList
          title={
            totalSenders
              ? `You can unsubscribe from ${share(canLeave)} of your senders`
              : 'How you can unsubscribe'
          }
          unit="senders"
          empty="Run a sync to see how you can unsubscribe."
          items={
            totalSenders
              ? [
                  {
                    key: 'one-click',
                    label: 'One click, done for you',
                    value: unsubscribe.oneClick,
                  },
                  { key: 'link', label: 'Through the sender’s page', value: unsubscribe.link },
                  { key: 'mail', label: 'By sending an email', value: unsubscribe.mail },
                  { key: 'none', label: 'No unsubscribe option', value: unsubscribe.none },
                ].map((item) => ({ ...item, sublabel: share(item.value) }))
              : []
          }
        />
      </div>
    </div>
  );
}
