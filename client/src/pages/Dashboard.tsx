import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSenders } from '../hooks/useSenders';
import { useSenderSummary } from '../hooks/useSenderSummary';
import Pagination from '../components/Pagination';
import SenderFilters from '../components/SenderFilters';
import SenderTable from '../components/SenderTable';
import SummaryCards from '../components/SummaryCards';
import SyncPanel from '../components/SyncPanel';
import type { SenderStatus } from '../lib/types';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  const { params, update, data, error, reload, setStatus } = useSenders();
  const { summary, reload: reloadSummary } = useSenderSummary();

  const refresh = useCallback(() => {
    reload();
    reloadSummary();
  }, [reload, reloadSummary]);

  const changeStatus = useCallback(
    async (id: string, status: Exclude<SenderStatus, 'UNSUBSCRIBED'>) => {
      await setStatus(id, status);
      reloadSummary();
    },
    [setStatus, reloadSummary],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
      <p className="mt-2 text-slate-600">See who sends you the most mail and decide who stays.</p>

      <SyncPanel onDone={refresh} />
      <SummaryCards summary={summary} />

      <section className="mt-8 space-y-4">
        <SenderFilters params={params} onChange={update} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {data && (
          <>
            <SenderTable senders={data.senders} onStatusChange={changeStatus} />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPage={(page) => update({ page })}
            />
          </>
        )}
      </section>
    </div>
  );
}
