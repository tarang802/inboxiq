import { useAuth } from '../context/AuthContext';
import SyncPanel from '../components/SyncPanel';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div>
      <h1 className="text-2xl font-semibold">{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
      <p className="mt-2 text-slate-600">Your senders will show up here after the first sync.</p>
      <SyncPanel />
    </div>
  );
}
