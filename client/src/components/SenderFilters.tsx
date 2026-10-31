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

const field =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

interface Props {
  params: SenderParams;
  onChange: (patch: Partial<SenderParams>) => void;
}

export default function SenderFilters({ params, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={params.q ?? ''}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Search by name, address or domain"
        aria-label="Search senders"
        className={`${field} sm:flex-1`}
      />
      <select
        value={params.status ?? ''}
        onChange={(e) => onChange({ status: (e.target.value || undefined) as SenderStatus })}
        aria-label="Filter by status"
        className={field}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={params.sort}
        onChange={(e) => {
          const option = SORT_OPTIONS.find((o) => o.value === e.target.value)!;
          onChange({ sort: option.value, order: option.order });
        }}
        aria-label="Sort senders"
        className={field}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={params.unsubscribable ?? false}
          onChange={(e) => onChange({ unsubscribable: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Can unsubscribe
      </label>
    </div>
  );
}
