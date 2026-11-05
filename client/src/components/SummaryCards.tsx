import { MailIcon, MailXIcon, MousePointerClickIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '../lib/format';
import type { SenderSummary } from '../lib/types';

interface StatProps {
  label: string;
  value: number | undefined;
  hint?: string;
  icon: typeof MailIcon;
}

function Stat({ label, value, hint, icon: Icon }: StatProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2">
          {label}
          <Icon className="size-4" />
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {value === undefined ? <Skeleton className="h-8 w-16" /> : formatCount(value)}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

export default function SummaryCards({ summary }: { summary: SenderSummary | null }) {
  const share =
    summary && summary.senders
      ? `${Math.round((summary.unsubscribable / summary.senders) * 100)}% of senders`
      : undefined;

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Senders" value={summary?.senders} icon={UsersIcon} />
      <Stat label="Emails in the last year" value={summary?.messages} icon={MailIcon} />
      <Stat label="Can unsubscribe" value={summary?.unsubscribable} hint={share} icon={MailXIcon} />
      <Stat label="One-click unsubscribe" value={summary?.oneClick} icon={MousePointerClickIcon} />
    </div>
  );
}
