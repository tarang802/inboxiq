import { useState } from 'react';
import { bulkAction, type BulkAction, type BulkResult } from '../lib/senders';
import type { Sender } from '../lib/types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describe(action: BulkAction, result: BulkResult) {
  if (action !== 'unsubscribe') return `Updated ${plural(result.updated ?? 0, 'sender')}.`;

  const parts = [`Unsubscribed from ${plural(result.unsubscribed?.length ?? 0, 'sender')}.`];
  if (result.failed?.length) parts.push(`${result.failed.length} refused the request.`);
  const skipped = result.skipped?.length ?? 0;
  if (skipped) {
    const who = skipped === 1 ? '1 sender needs' : `${skipped} senders need`;
    parts.push(`${who} a link or email, so do those one by one.`);
  }
  return parts.join(' ');
}

interface Props {
  senders: Sender[];
  onDone: () => void;
  onClear: () => void;
}

export default function BulkActions({ senders, onDone, onClear }: Props) {
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!senders.length && !message) return null;

  const oneClick = senders.filter((s) => s.oneClick && s.status !== 'UNSUBSCRIBED').length;

  async function run(action: BulkAction) {
    setBusy(action);
    setMessage(null);
    try {
      const result = await bulkAction(
        senders.map((s) => s.id),
        action,
      );
      setMessage(describe(action, result));
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const button =
    'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50';

  return (
    <div className="sticky top-2 z-10 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 shadow-sm">
      {senders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium">
            {plural(senders.length, 'sender')} selected
          </span>
          <button className={button} disabled={!!busy} onClick={() => run('keep')}>
            Keep
          </button>
          <button className={button} disabled={!!busy} onClick={() => run('ignore')}>
            Ignore
          </button>
          <button className={button} disabled={!!busy} onClick={() => run('reset')}>
            Reset
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={!!busy || oneClick === 0}
            title={oneClick ? undefined : 'None of these support one-click unsubscribe'}
            onClick={() => run('unsubscribe')}
          >
            {busy === 'unsubscribe' ? 'Unsubscribing…' : `Unsubscribe from ${oneClick} (one-click)`}
          </button>
          <button
            className="ml-auto text-sm text-slate-600 dark:text-slate-400 hover:underline"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      )}
      {message && (
        <div className="flex items-start justify-between gap-3 text-sm text-slate-700 dark:text-slate-300 [&:not(:first-child)]:mt-2">
          <p>{message}</p>
          <button
            className="text-slate-500 dark:text-slate-400 hover:underline"
            onClick={() => setMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
