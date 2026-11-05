import {
  ArrowRightIcon,
  ChartBarIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  MailIcon,
  MousePointerClickIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

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

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: 'See who sends the most',
    body: 'Every sender from the last year, ranked by a clutter score that weighs volume, recency and newsletter signals.',
  },
  {
    icon: MousePointerClickIcon,
    title: 'Unsubscribe in one click',
    body: 'Senders that support it are unsubscribed straight from the dashboard, one at a time or in bulk.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Private by design',
    body: 'Sieve reads four email headers and keeps one summary per sender. Delete everything whenever you like.',
  },
];

export default function Home() {
  usePageTitle();
  const { status } = useAuth();
  const [params] = useSearchParams();
  const error = params.get('error');
  const deleted = params.get('deleted') === '1';

  return (
    <div className="py-12 sm:py-16">
      <section className="mx-auto max-w-2xl text-center">
        {deleted && (
          <Alert className="mb-8 text-left">
            <CircleCheckIcon />
            <AlertTitle>Your data is deleted</AlertTitle>
            <AlertDescription>Sieve no longer has access to your Gmail.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-8 text-left">
            <CircleAlertIcon />
            <AlertTitle>Sign-in didn't finish</AlertTitle>
            <AlertDescription>
              {ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
        <Badge variant="secondary" className="mb-4">
          <ShieldCheckIcon />
          Headers only, never your messages
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Take back your inbox
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          See who fills your inbox, unsubscribe in one click, and keep only what matters.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {status === 'signed-in' ? (
            <Button asChild size="lg" className="px-5">
              <Link to="/dashboard">
                Go to dashboard
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="px-5">
              <a href="/api/auth/google">
                <MailIcon data-icon="inline-start" />
                Connect Gmail
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="lg">
            <Link to="/privacy">What Sieve can and can't see</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
