import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './PageLoader';

export default function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') return <PageLoader />;
  if (status === 'signed-out') return <Navigate to="/" replace />;

  return <Outlet />;
}
