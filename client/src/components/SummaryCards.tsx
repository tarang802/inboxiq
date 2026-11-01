import { formatCount } from '../lib/format';
import type { SenderSummary } from '../lib/types';

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function SummaryCards({ summary }: { summary: SenderSummary | null }) {
  const show = (n: number | undefined) => (n === undefined ? '–' : formatCount(n));
  const share =
    summary && summary.senders
      ? `${Math.round((summary.unsubscribable / summary.senders) * 100)}% of senders`
      : undefined;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Senders" value={show(summary?.senders)} />
      <Card label="Emails in the last year" value={show(summary?.messages)} />
      <Card label="Can unsubscribe" value={show(summary?.unsubscribable)} hint={share} />
      <Card label="One-click unsubscribe" value={show(summary?.oneClick)} />
    </div>
  );
}
