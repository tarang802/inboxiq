import { useAuth } from '../context/AuthContext';

export default function ReconnectBanner() {
  const { status, gmailConnected } = useAuth();
  if (status !== 'signed-in' || gmailConnected) return null;

  return (
    <div
      className="border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
      role="alert"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm text-amber-900 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Sieve lost access to your Gmail. While the app is in testing, Google ends access about
          every 7 days. Your senders are still here.
        </p>
        <a
          href="/api/auth/google"
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-center font-medium text-white hover:bg-amber-700"
        >
          Reconnect Gmail
        </a>
      </div>
    </div>
  );
}
