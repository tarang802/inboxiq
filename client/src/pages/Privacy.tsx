import type { ReactNode } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 text-slate-600 dark:text-slate-400">{children}</div>
    </section>
  );
}

export default function Privacy() {
  usePageTitle('Privacy');
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Sieve exists to clean up your inbox, not to read it. This page says exactly what it touches.
      </p>

      <Section title="What Sieve reads">
        <p>
          Sieve asks Google for the <code>gmail.metadata</code> permission. That lets it see message
          headers and labels, but never the body of an email or its attachments.
        </p>
        <p>
          Of those headers it only requests four: <strong>From</strong>, <strong>Date</strong>,{' '}
          <strong>List-Unsubscribe</strong> and <strong>List-Unsubscribe-Post</strong>. Subjects are
          not requested.
        </p>
      </Section>

      <Section title="What Sieve stores">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your Google name, email address and profile picture link, to sign you in.</li>
          <li>
            One summary per sender: their address, display name, how many emails they sent in the
            last year, when the first and latest arrived, and their unsubscribe link if they gave
            one.
          </li>
          <li>Whether you kept, ignored or unsubscribed from each sender.</li>
          <li>
            A Google refresh token, encrypted with AES-256-GCM, so syncs can run without signing in
            again.
          </li>
        </ul>
        <p>
          Sieve does not keep individual emails, message ids or subjects. Each sync folds the
          headers into the per-sender totals and throws the rest away.
        </p>
      </Section>

      <Section title="What Sieve does on your behalf">
        <p>
          Nothing, unless you ask. When you unsubscribe from a sender that supports one-click
          unsubscribe, Sieve sends that request for you. For other senders it opens their
          unsubscribe link or email so you can finish it yourself. Sieve cannot send, delete or move
          your email.
        </p>
      </Section>

      <Section title="Sharing">
        <p>
          Your data is not sold, shared or used for ads, and nobody reads it. Sieve's use of
          information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          On the Account page you can delete everything Sieve holds about you. That removes your
          account and sender summaries from the database and revokes Sieve's access to your Gmail at
          Google. You can also revoke access any time from your{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Google account settings
          </a>
          .
        </p>
      </Section>
    </article>
  );
}
