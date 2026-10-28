import { useNavigate } from 'react-router-dom';
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
      {user.picture ? (
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
          {initial}
        </span>
      )}
      <span className="hidden text-slate-700 sm:inline">{user.name ?? user.email}</span>
      <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
        Log out
      </button>
    </div>
  );
}
