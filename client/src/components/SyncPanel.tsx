import { RefreshCwIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../hooks/useSync';
import { formatCount, formatDateTime } from '../lib/format';

// matches the server's error when the stored google token stops working
const RECONNECT_REQUIRED = 'gmail_reconnect_required';

// gmail can't tell us up front how many emails a year holds, so the bar just moves
function ProgressBar() {
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
      role="progressbar"
    >
      <div className="h-full w-1/3 animate-[sync-slide_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}

export default function SyncPanel({
  onDone,
  onProgress,
}: {
  onDone?: () => void;
  onProgress?: () => void;
}) {
  const { sync, error, active, starting, start } = useSync(onDone, onProgress);
  const { gmailConnected, refresh } = useAuth();

  let status = 'You have not synced yet.';
  // a catch-up sync only reports its count at the end, so 0 means "still looking"
  if (sync && active) {
    status = sync.processed
      ? `Scanning your inbox… ${formatCount(sync.processed)} emails so far`
      : 'Checking your inbox…';
  }
  if (sync?.status === 'DONE' && sync.finishedAt) {
    const found = sync.processed ? `${formatCount(sync.processed)} emails checked` : 'no new mail';
    status = `Last synced ${formatDateTime(sync.finishedAt)} · ${found}`;
  }
  if (sync?.status === 'FAILED') status = 'The last sync failed. Try again in a minute.';

  // once the user reconnects, the old failed run shouldn't keep asking them to
  const failedOnToken = sync?.status === 'FAILED' && sync.error === RECONNECT_REQUIRED;
  const needsReconnect = failedOnToken && !gmailConnected;
  if (needsReconnect) status = 'Your Gmail connection expired.';
  else if (failedOnToken) status = 'Gmail is connected again. Run a sync to catch up.';

  // a sync can be the first thing to notice the token died, so update the banner too
  useEffect(() => {
    if (failedOnToken && gmailConnected) refresh();
  }, [failedOnToken, gmailConnected, refresh]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Inbox sync</CardTitle>
        <CardDescription>{status}</CardDescription>
        <CardAction>
          {needsReconnect ? (
            <Button asChild>
              <a href="/api/auth/google">Reconnect Gmail</a>
            </Button>
          ) : (
            <Button onClick={start} disabled={active || starting}>
              <RefreshCwIcon className={cn(active && 'animate-spin')} />
              {active ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {(error || active) && (
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {active && <ProgressBar />}
        </CardContent>
      )}
    </Card>
  );
}
