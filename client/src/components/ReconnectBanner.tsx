import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

export default function ReconnectBanner() {
  const { status, gmailConnected } = useAuth();
  if (status !== 'signed-in' || gmailConnected) return null;

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
      role="alert"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex gap-2">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Sieve lost access to your Gmail. While the app is in testing, Google ends access about
            every 7 days. Your senders are still here.
          </span>
        </p>
        <Button asChild size="sm" className="shrink-0 bg-amber-600 text-white hover:bg-amber-700">
          <a href="/api/auth/google">Reconnect Gmail</a>
        </Button>
      </div>
    </div>
  );
}
