import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
        <p>Sieve reads email headers only, never your messages.</p>
        <nav className="flex gap-4">
          <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-slate-100">
            Privacy
          </Link>
          <a
            href="https://github.com/tarang802/inboxiq"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
