import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* the name is hidden on phones, so the avatar is the way into account settings */}
      <Link to="/account" aria-label="Account">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {initial}
          </span>
        )}
      </Link>
      <Link
        to="/account"
        className="hidden text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 sm:inline"
      >
        {user.name ?? user.email}
      </Link>
      <button
        onClick={handleLogout}
        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      >
        Log out
      </button>
    </div>
  );
}
