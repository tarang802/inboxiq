import { formatCount } from '../lib/format';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);

  const button =
    'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
      <p>
        {formatCount(from)}–{formatCount(to)} of {formatCount(total)}
      </p>
      <div className="flex gap-2">
        <button className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
