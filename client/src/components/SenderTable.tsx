import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCount, timeAgo } from '../lib/format';
import type { Sender, SenderStatus } from '../lib/types';
import UnsubscribeAction from './UnsubscribeAction';

type SettableStatus = Exclude<SenderStatus, 'UNSUBSCRIBED'>;

function UnsubscribeBadge({ sender }: { sender: Sender }) {
  if (sender.oneClick) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">One-click</Badge>
    );
  }
  if (sender.unsubscribeUrl) {
    return <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300">Link</Badge>;
  }
  if (sender.unsubscribeMail) {
    return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">Email</Badge>;
  }
  return <Badge variant="secondary">None</Badge>;
}

function ClutterBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-muted-foreground/50';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-fit items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full', color)} style={{ width: `${score}%` }} />
          </div>
          <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{score}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Clutter score {score} of 100: volume, recency and newsletter signals
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  senders: Sender[];
  onStatusChange: (id: string, status: SettableStatus) => Promise<void>;
  onUnsubscribe: (id: string, confirm: boolean) => Promise<void>;
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export default function SenderTable({
  senders,
  onStatusChange,
  onUnsubscribe,
  selected,
  onSelectionChange,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const allSelected = senders.length > 0 && senders.every((s) => selected.has(s.id));
  const someSelected = !allSelected && senders.some((s) => selected.has(s.id));

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  // header checkbox works on the visible page only
  function toggleAll() {
    onSelectionChange(allSelected ? new Set() : new Set(senders.map((s) => s.id)));
  }

  // clicking the active choice again puts the sender back to normal
  async function toggle(sender: Sender, status: SettableStatus) {
    setBusyId(sender.id);
    try {
      await onStatusChange(sender.id, sender.status === status ? 'ACTIVE' : status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'could not update the sender');
    } finally {
      setBusyId(null);
    }
  }

  function statusButton(sender: Sender, status: SettableStatus, label: string, done: string) {
    const active = sender.status === status;
    return (
      <Button
        variant={active ? 'secondary' : 'ghost'}
        size="xs"
        className={cn(active && 'bg-primary/10 text-primary hover:bg-primary/15')}
        aria-pressed={active}
        disabled={busyId === sender.id}
        onClick={() => toggle(sender, status)}
      >
        {active ? done : label}
      </Button>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all senders on this page"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Sender</TableHead>
            <TableHead className="text-right">Emails</TableHead>
            <TableHead>Last email</TableHead>
            <TableHead>Unsubscribe</TableHead>
            <TableHead>Clutter</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {senders.map((sender) => (
            <TableRow key={sender.id} data-state={selected.has(sender.id) ? 'selected' : undefined}>
              <TableCell className="pl-4">
                <Checkbox
                  aria-label={`Select ${sender.name ?? sender.email}`}
                  checked={selected.has(sender.id)}
                  onCheckedChange={() => toggleRow(sender.id)}
                />
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate font-medium">{sender.name ?? sender.email}</p>
                {sender.name && (
                  <p className="truncate text-xs text-muted-foreground">{sender.email}</p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCount(sender.messageCount)}
              </TableCell>
              <TableCell className="text-muted-foreground">{timeAgo(sender.lastSeenAt)}</TableCell>
              <TableCell>
                <UnsubscribeBadge sender={sender} />
              </TableCell>
              <TableCell>
                <ClutterBar score={sender.clutterScore} />
              </TableCell>
              <TableCell>
                {sender.status === 'UNSUBSCRIBED' ? (
                  <span className="text-xs text-muted-foreground">Unsubscribed</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <UnsubscribeAction sender={sender} onUnsubscribe={onUnsubscribe} />
                    {statusButton(sender, 'KEPT', 'Keep', 'Kept')}
                    {statusButton(sender, 'IGNORED', 'Ignore', 'Ignored')}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
