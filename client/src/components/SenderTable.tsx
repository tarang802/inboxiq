import { useState } from 'react';
import { formatCount, timeAgo } from '../lib/format';
import type { Sender, SenderStatus } from '../lib/types';

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
}

export default function SenderTable({ senders, onStatusChange }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
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
            <tr key={sender.id} className="hover:bg-slate-50">
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
                  <div className="flex gap-2">
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
