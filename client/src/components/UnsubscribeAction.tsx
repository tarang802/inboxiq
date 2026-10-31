import { useState } from 'react';
import type { Sender } from '../lib/types';

// links come from email headers, so never render anything but web or mail links
function safeHref(url: string | null) {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(protocol) ? url : null;
  } catch {
    return null;
  }
}

interface Props {
  sender: Sender;
  onUnsubscribe: (id: string, confirm: boolean) => Promise<void>;
}

const button =
  'rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50';

export default function UnsubscribeAction({ sender, onUnsubscribe }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

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

  // no one-click: the user unsubscribes on the sender's page or by email, then tells us
  const href = safeHref(sender.unsubscribeUrl) ?? safeHref(sender.unsubscribeMail);
  if (!href) return null;

  if (opened) {
    return (
      <span className="inline-flex flex-col">
        <button className={button} disabled={busy} onClick={() => run(true)}>
          {busy ? 'Saving…' : 'Done? Mark it'}
        </button>
        {error && (
          <span className="mt-1 max-w-40 whitespace-normal text-xs text-red-600">{error}</span>
        )}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setOpened(true)}
      className={button}
      title={href.startsWith('mailto:') ? 'Opens an unsubscribe email' : 'Opens the sender’s page'}
    >
      {href.startsWith('mailto:') ? 'Unsubscribe by email ↗' : 'Unsubscribe ↗'}
    </a>
  );
}
