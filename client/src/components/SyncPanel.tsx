import { useSync } from '../hooks/useSync';
import { formatCount, formatDateTime } from '../lib/format';

// matches the server's error when the stored google token stops working
const RECONNECT_REQUIRED = 'gmail_reconnect_required';

// gmail can't tell us up front how many emails a year holds, so the bar just moves
function ProgressBar() {
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100"
      role="progressbar"
    >
      <div className="h-full w-1/3 animate-[sync-slide_1.4s_ease-in-out_infinite] rounded-full bg-indigo-500" />
    </div>
  );
}

export default function SyncPanel({ onDone }: { onDone?: () => void }) {
  const { sync, error, active, starting, start } = useSync(onDone);

  let status = 'You have not synced yet.';
  if (sync && active) status = `Scanning your inbox… ${formatCount(sync.processed)} emails so far`;
  if (sync?.status === 'DONE' && sync.finishedAt) {
    status = `Last synced ${formatDateTime(sync.finishedAt)} · ${formatCount(sync.processed)} emails scanned`;
  }
  if (sync?.status === 'FAILED') status = 'The last sync failed. Try again in a minute.';

  const needsReconnect = sync?.status === 'FAILED' && sync.error === RECONNECT_REQUIRED;
  if (needsReconnect) status = 'Your Gmail connection expired.';

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="sm:flex-1">
        <p className="font-medium">Inbox sync</p>
        <p className="mt-1 text-sm text-slate-600">{status}</p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {active && <ProgressBar />}
      </div>
      {needsReconnect ? (
        <a
          href="/api/auth/google"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          Reconnect Gmail
        </a>
      ) : (
        <button
          onClick={start}
          disabled={active || starting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {active ? 'Syncing…' : 'Sync now'}
        </button>
      )}
    </div>
  );
}
