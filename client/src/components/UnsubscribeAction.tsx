import { useState } from 'react';
import type { Sender } from '../lib/types';

interface Props {
  sender: Sender;
  onUnsubscribe: (id: string, confirm: boolean) => Promise<void>;
}

const button =
  'rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50';

export default function UnsubscribeAction({ sender, onUnsubscribe }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(confirm: boolean) {
    setBusy(true);
    setError(null);
    try {
      await onUnsubscribe(sender.id, confirm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unsubscribe failed');
    } finally {
      setBusy(false);
    }
  }

  if (sender.oneClick) {
    return (
      <span className="inline-flex flex-col">
        <button className={button} disabled={busy} onClick={() => run(false)}>
          {busy ? 'Unsubscribing…' : 'Unsubscribe'}
        </button>
        {error && (
          <span className="mt-1 max-w-40 whitespace-normal text-xs text-red-600">{error}</span>
        )}
      </span>
    );
  }

  return null;
}
