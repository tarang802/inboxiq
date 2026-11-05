import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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

  if (!senders.length) return null;

  const oneClick = senders.filter((s) => s.oneClick && s.status !== 'UNSUBSCRIBED').length;

  async function run(action: BulkAction) {
    setBusy(action);
    try {
      const result = await bulkAction(
        senders.map((s) => s.id),
        action,
      );
      const message = describe(action, result);
      if (result.failed?.length) toast.warning(message);
      else toast.success(message);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'something went wrong');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <span className="mr-1 text-sm font-medium">{plural(senders.length, 'sender')} selected</span>
      <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('keep')}>
        Keep
      </Button>
      <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('ignore')}>
        Ignore
      </Button>
      <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('reset')}>
        Reset
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={!!busy || oneClick === 0}
            title={oneClick ? undefined : 'None of these support one-click unsubscribe'}
          >
            {busy === 'unsubscribe' ? 'Unsubscribing…' : `Unsubscribe from ${oneClick}`}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from {plural(oneClick, 'sender')}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sieve sends each of them a one-click unsubscribe request. Senders without one-click
              support are skipped; do those one by one from the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => run('unsubscribe')}>
              Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        <XIcon />
        Clear
      </Button>
    </div>
  );
}
