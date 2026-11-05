import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p>Sieve reads email headers only, never your messages.</p>
        <nav className="flex gap-4">
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <a
            href="https://github.com/tarang802/inboxiq"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
