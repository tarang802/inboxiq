import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-2.5 py-1.5 text-sm transition-colors hover:text-foreground',
    isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
  );

export default function Navbar() {
  const { status } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Sieve<span className="text-primary">.</span>
        </Link>
        <div className="flex items-center gap-1">
          {status === 'signed-in' && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/insights" className={navClass}>
                Insights
              </NavLink>
            </>
          )}
          <ThemeToggle />
          {status === 'signed-in' && <UserMenu />}
          {status === 'signed-out' && (
            <Button asChild size="sm">
              <a href="/api/auth/google">Sign in</a>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
