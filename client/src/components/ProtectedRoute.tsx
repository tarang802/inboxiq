import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <p className="py-16 text-center text-slate-500">Loading...</p>;
  }

  if (status === 'signed-out') return <Navigate to="/" replace />;

  return <Outlet />;
}
