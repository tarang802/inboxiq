import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCount } from '../lib/format';

export interface BarItem {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  // shown on hover, e.g. "12 senders"
  detail?: string;
}

interface Props {
  title: string;
  items: BarItem[];
  unit: string;
  empty?: string;
}

// horizontal bars, one hue. labels and values stay in text colors so the bar only
// carries length. every value is printed, so the list doubles as its own table
export default function BarList({ title, items, unit, empty = 'Nothing to show yet.' }: Props) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ol className="-mx-2 space-y-1">
            {items.map((item) => (
              <li
                key={item.key}
                className="group rounded-md px-2 py-1.5 hover:bg-muted/50"
                title={`${item.label}: ${formatCount(item.value)} ${unit}${item.detail ? ` · ${item.detail}` : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span>{item.label}</span>
                    {item.sublabel && (
                      <span className="ml-2 text-xs text-muted-foreground">{item.sublabel}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatCount(item.value)}
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full">
                  <div
                    className="h-full rounded-r bg-chart-1 transition-[width] group-hover:bg-primary"
                    style={{ width: `${(item.value / max) * 100}%`, minWidth: '2px' }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
