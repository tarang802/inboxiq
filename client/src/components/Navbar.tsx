import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Sieve<span className="text-indigo-600">.</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link to="/dashboard" className="hover:text-slate-900">
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}
