import { CircleAlertIcon, InboxIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { usePageTitle } from '../hooks/usePageTitle';

// stands in for the table while the first page loads
function TableSkeleton() {
  return (
    <Card className="gap-0 py-0">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
          <Skeleton className="size-4" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-4 w-10" />
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
      ))}
    </Card>
  );
}

export default function Dashboard() {
  usePageTitle('Dashboard');
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
      <p className="mt-1 text-muted-foreground">
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
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Couldn't load your senders</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!data && !error && <TableSkeleton />}
        {data && data.total === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
            <InboxIcon className="size-8 text-muted-foreground" />
            {hasFilters ? (
              <>
                <p className="mt-3 font-medium">No senders match these filters</p>
                <Button
                  variant="link"
                  onClick={() => update({ q: '', status: undefined, unsubscribable: false })}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 font-medium">No senders yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
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
