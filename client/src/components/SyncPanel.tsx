import { useSync } from '../hooks/useSync';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function SyncPanel() {
  const { sync, error, active, starting, start } = useSync();

  let status = 'You have not synced yet.';
  if (sync && active) status = `Scanning your inbox… ${sync.processed.toLocaleString()} emails so far`;
  if (sync?.status === 'DONE' && sync.finishedAt) {
    status = `Last synced ${formatTime(sync.finishedAt)} · ${sync.processed.toLocaleString()} emails scanned`;
  }
  if (sync?.status === 'FAILED') status = 'The last sync failed.';

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Inbox sync</p>
        <p className="mt-1 text-sm text-slate-600">{status}</p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        onClick={start}
        disabled={active || starting}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {active ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  );
}
