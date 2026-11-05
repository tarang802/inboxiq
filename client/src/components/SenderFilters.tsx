import { SearchIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SenderParams, SenderSort } from '../lib/senders';
import type { SenderStatus } from '../lib/types';

const SORT_OPTIONS: { value: SenderSort; label: string; order: 'asc' | 'desc' }[] = [
  { value: 'clutter', label: 'Most clutter', order: 'desc' },
  { value: 'count', label: 'Most emails', order: 'desc' },
  { value: 'recent', label: 'Most recent', order: 'desc' },
  { value: 'name', label: 'Address A–Z', order: 'asc' },
];

const STATUS_OPTIONS: { value: SenderStatus | ''; label: string }[] = [
  { value: '', label: 'All senders' },
  { value: 'ACTIVE', label: 'Not reviewed' },
  { value: 'KEPT', label: 'Kept' },
  { value: 'IGNORED', label: 'Ignored' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
];

// radix select can't hold an empty value, so 'all' stands in for no filter
const ALL = 'all';

interface Props {
  params: SenderParams;
  onChange: (patch: Partial<SenderParams>) => void;
}

export default function SenderFilters({ params, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative sm:flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={params.q ?? ''}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search by name, address or domain"
          aria-label="Search senders"
          className="pl-8"
        />
      </div>
      <Select
        value={params.status ?? ALL}
        onValueChange={(v) => onChange({ status: v === ALL ? undefined : (v as SenderStatus) })}
      >
        <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value || ALL} value={o.value || ALL}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.sort}
        onValueChange={(v) => {
          const option = SORT_OPTIONS.find((o) => o.value === v)!;
          onChange({ sort: option.value, order: option.order });
        }}
      >
        <SelectTrigger aria-label="Sort senders" className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Checkbox
          id="unsubscribable"
          checked={params.unsubscribable ?? false}
          onCheckedChange={(checked) => onChange({ unsubscribable: checked === true })}
        />
        <Label htmlFor="unsubscribable" className="font-normal whitespace-nowrap">
          Can unsubscribe
        </Label>
      </div>
    </div>
  );
}
