import { useState } from 'react';
import { formatCount, timeAgo } from '../lib/format';
import type { Sender, SenderStatus } from '../lib/types';
import UnsubscribeAction from './UnsubscribeAction';

type SettableStatus = Exclude<SenderStatus, 'UNSUBSCRIBED'>;

function UnsubscribeBadge({ sender }: { sender: Sender }) {
  let label = 'None';
  let style = 'bg-slate-100 text-slate-500';

  if (sender.oneClick) {
    label = 'One-click';
    style = 'bg-emerald-50 text-emerald-700';
  } else if (sender.unsubscribeUrl) {
    label = 'Link';
    style = 'bg-sky-50 text-sky-700';
  } else if (sender.unsubscribeMail) {
    label = 'Email';
    style = 'bg-amber-50 text-amber-700';
  }

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

function ClutterBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-400';

  return (
    <div className="flex items-center gap-2" title={`Clutter score ${score} of 100`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-xs tabular-nums text-slate-600">{score}</span>
    </div>
  );
}

interface ActionButtonProps {
  active: boolean;
  label: string;
  activeLabel: string;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ active, label, activeLabel, disabled, onClick }: ActionButtonProps) {
  const style = active
    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
    : 'border-slate-200 text-slate-600 hover:bg-slate-100';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${style}`}
    >
      {active ? activeLabel : label}
    </button>
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
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 py-3 pl-4">
              <input
                type="checkbox"
                aria-label="Select all senders on this page"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
            </th>
            <th className="px-4 py-3 font-medium">Sender</th>
            <th className="px-4 py-3 text-right font-medium">Emails</th>
            <th className="px-4 py-3 font-medium">Last email</th>
            <th className="px-4 py-3 font-medium">Unsubscribe</th>
            <th className="px-4 py-3 font-medium">Clutter</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {senders.map((sender) => (
            <tr
              key={sender.id}
              className={selected.has(sender.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}
            >
              <td className="py-3 pl-4">
                <input
                  type="checkbox"
                  aria-label={`Select ${sender.name ?? sender.email}`}
                  checked={selected.has(sender.id)}
                  onChange={() => toggleRow(sender.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
              </td>
              <td className="max-w-xs px-4 py-3">
                <p className="truncate font-medium">{sender.name ?? sender.email}</p>
                {sender.name && <p className="truncate text-xs text-slate-500">{sender.email}</p>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCount(sender.messageCount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {timeAgo(sender.lastSeenAt)}
              </td>
              <td className="px-4 py-3">
                <UnsubscribeBadge sender={sender} />
              </td>
              <td className="px-4 py-3">
                <ClutterBar score={sender.clutterScore} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {sender.status === 'UNSUBSCRIBED' ? (
                  <span className="text-xs text-slate-500">Unsubscribed</span>
                ) : (
                  <div className="flex items-start gap-2">
                    <UnsubscribeAction sender={sender} onUnsubscribe={onUnsubscribe} />
                    <ActionButton
                      label="Keep"
                      activeLabel="Kept"
                      active={sender.status === 'KEPT'}
                      disabled={busyId === sender.id}
                      onClick={() => toggle(sender, 'KEPT')}
                    />
                    <ActionButton
                      label="Ignore"
                      activeLabel="Ignored"
                      active={sender.status === 'IGNORED'}
                      disabled={busyId === sender.id}
                      onClick={() => toggle(sender, 'IGNORED')}
                    />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
