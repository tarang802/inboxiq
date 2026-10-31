import { formatCount, timeAgo } from '../lib/format';
import type { Sender } from '../lib/types';

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

interface Props {
  senders: Sender[];
}

export default function SenderTable({ senders }: Props) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
