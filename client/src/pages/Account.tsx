import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

const CONFIRM_WORD = 'delete';

export default function Account() {
  usePageTitle('Account');
  const { user, deleteAccount, refresh } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/?deleted=1', { replace: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not delete your data');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Signed in as {user?.email}.</p>

      <section className="mt-8 rounded-xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-medium text-red-700 dark:text-red-300">Delete my data</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This removes your Sieve account, your sender list, sync history and the stored Google
          token, and tells Google to revoke Sieve's access. Senders you unsubscribed from stay
          unsubscribed. This can't be undone.
        </p>
        <label className="mt-4 block text-sm text-slate-700 dark:text-slate-300">
          Type <span className="font-mono font-medium">{CONFIRM_WORD}</span> to confirm
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:w-64"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={handleDelete}
          disabled={typed.trim().toLowerCase() !== CONFIRM_WORD || busy}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Delete everything'}
        </button>
      </section>
    </div>
  );
}
