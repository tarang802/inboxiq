import { CheckIcon, ExternalLinkIcon, MailIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Sender } from '../lib/types';

// links come from email headers, so never render anything but web or mail links
function safeHref(url: string | null) {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(protocol) ? url : null;
  } catch {
    return null;
  }
}

interface Props {
  sender: Sender;
  onUnsubscribe: (id: string, confirm: boolean) => Promise<void>;
}

const tone = 'text-destructive hover:text-destructive';

export default function UnsubscribeAction({ sender, onUnsubscribe }: Props) {
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const name = sender.name ?? sender.email;

  async function run(confirm: boolean) {
    setBusy(true);
    try {
      await onUnsubscribe(sender.id, confirm);
      toast.success(confirm ? `Marked ${name} as unsubscribed` : `Unsubscribed from ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'unsubscribe failed', {
        description: name,
      });
    } finally {
      setBusy(false);
    }
  }

  if (sender.oneClick) {
    return (
      <Button
        variant="outline"
        size="xs"
        className={tone}
        disabled={busy}
        onClick={() => run(false)}
      >
        {busy ? 'Unsubscribing…' : 'Unsubscribe'}
      </Button>
    );
  }

  // no one-click: the user unsubscribes on the sender's page or by email, then tells us
  const href = safeHref(sender.unsubscribeUrl) ?? safeHref(sender.unsubscribeMail);
  if (!href) return null;

  if (opened) {
    return (
      <Button variant="outline" size="xs" disabled={busy} onClick={() => run(true)}>
        <CheckIcon />
        {busy ? 'Saving…' : 'Done? Mark it'}
      </Button>
    );
  }

  const byMail = href.startsWith('mailto:');
  return (
    <Button asChild variant="outline" size="xs" className={tone}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        title={byMail ? 'Opens an unsubscribe email' : 'Opens the sender’s page'}
      >
        {byMail ? <MailIcon /> : <ExternalLinkIcon />}
        Unsubscribe
      </a>
    </Button>
  );
}
