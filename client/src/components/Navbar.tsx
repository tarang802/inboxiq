import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-medium text-slate-900' : 'hover:text-slate-900';

export default function Navbar() {
  const { status } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Sieve<span className="text-indigo-600">.</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600">
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
            <a href="/api/auth/google" className="hover:text-slate-900">
              Sign in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
