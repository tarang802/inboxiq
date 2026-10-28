import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  state_mismatch: 'That sign-in link expired. Please try again.',
  invalid_request: 'Something went wrong with sign-in. Please try again.',
  gmail_permission_missing:
    'Sieve needs permission to read email headers. Please allow it on the Google screen.',
  no_email: 'Your Google account did not share an email address.',
  no_refresh_token: 'Google did not grant offline access. Please try signing in again.',
  not_configured: 'Google sign-in is not set up on this server yet.',
};

export default function Home() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <section className="py-16 text-center">
      {error && (
        <p className="mx-auto mb-8 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.'}
        </p>
      )}
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Take back your inbox</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        See who fills your inbox, unsubscribe in one click, and keep only what matters. We only read
        email headers, never your messages.
      </p>
      {status === 'signed-in' ? (
        <Link
          to="/dashboard"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Go to dashboard
        </Link>
      ) : (
        <a
          href="/api/auth/google"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Connect Gmail
        </a>
      )}
    </section>
  );
}
