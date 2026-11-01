import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'font-medium text-slate-900 dark:text-slate-100'
    : 'hover:text-slate-900 dark:hover:text-slate-100';

export default function Navbar() {
  const { status } = useAuth();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Sieve<span className="text-indigo-600 dark:text-indigo-400">.</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          {status === 'signed-in' && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/insights" className={navClass}>
                Insights
              </NavLink>
              <UserMenu />
            </>
          )}
          {status === 'signed-out' && (
            <a href="/api/auth/google" className="hover:text-slate-900 dark:hover:text-slate-100">
              Sign in
            </a>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
