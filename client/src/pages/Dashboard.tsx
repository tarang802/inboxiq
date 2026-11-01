import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSenders } from '../hooks/useSenders';
import { useSenderSummary } from '../hooks/useSenderSummary';
import BulkActions from '../components/BulkActions';
import Pagination from '../components/Pagination';
import SenderFilters from '../components/SenderFilters';
import SenderTable from '../components/SenderTable';
import SummaryCards from '../components/SummaryCards';
import SyncPanel from '../components/SyncPanel';
import type { SenderStatus } from '../lib/types';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  const { params, update, data, loading, error, reload, setStatus, unsubscribe } = useSenders();
  const { summary, reload: reloadSummary } = useSenderSummary();
  const hasFilters = Boolean(params.q || params.status || params.unsubscribable);

  // a new page or filter means a new set of rows, so start the selection over
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set()), [params]);

  const selectedSenders = data?.senders.filter((s) => selected.has(s.id)) ?? [];

  const refresh = useCallback(() => {
    reload();
    reloadSummary();
  }, [reload, reloadSummary]);

  const afterBulk = useCallback(() => {
    setSelected(new Set());
    refresh();
  }, [refresh]);

  const changeStatus = useCallback(
    async (id: string, status: Exclude<SenderStatus, 'UNSUBSCRIBED'>) => {
      await setStatus(id, status);
      reloadSummary();
    },
    [setStatus, reloadSummary],
  );

  const handleUnsubscribe = useCallback(
    async (id: string, confirm: boolean) => {
      await unsubscribe(id, confirm);
      reloadSummary();
    },
    [unsubscribe, reloadSummary],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        See who sends you the most mail and decide who stays.
      </p>

      <SyncPanel onDone={refresh} onProgress={refresh} />
      <SummaryCards summary={summary} />

      <section className="mt-8 space-y-4">
        <SenderFilters params={params} onChange={update} />
        <BulkActions
          senders={selectedSenders}
          onDone={afterBulk}
          onClear={() => setSelected(new Set())}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!data && !error && (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        )}
        {data && data.total === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center">
            {hasFilters ? (
              <p className="text-slate-600 dark:text-slate-400">No senders match these filters.</p>
            ) : (
              <>
                <p className="font-medium">No senders yet</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Run a sync above and your senders will show up here.
                </p>
              </>
            )}
          </div>
        )}
        {data && data.total > 0 && (
          <div
            className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}
            aria-busy={loading}
          >
            <SenderTable
              senders={data.senders}
              onStatusChange={changeStatus}
              onUnsubscribe={handleUnsubscribe}
              selected={selected}
              onSelectionChange={setSelected}
            />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPage={(page) => update({ page })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
