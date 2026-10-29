import { isOneClick, parseFrom, parseListUnsubscribe } from '../lib/headers';
import type { MessageMeta } from './gmail';

export interface SenderAggregate {
  email: string;
  name: string | null;
  domain: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  unsubscribeUrl: string | null;
  unsubscribeMail: string | null;
  oneClick: boolean;
}

function messageDate(msg: MessageMeta) {
  if (msg.internalDate) return new Date(msg.internalDate);
  const parsed = Date.parse(msg.headers.date ?? '');
  return new Date(Number.isNaN(parsed) ? Date.now() : parsed);
}

// folds messages into one summary per sender address. nothing per message is kept
export class SenderAggregator {
  private senders = new Map<string, SenderAggregate>();

  add(msg: MessageMeta) {
    const from = parseFrom(msg.headers.from);
    if (!from) return false;

    const date = messageDate(msg);
    const unsub = parseListUnsubscribe(msg.headers['list-unsubscribe']);
    const hasUnsub = Boolean(unsub.url || unsub.mail);
    const oneClick = isOneClick(unsub, msg.headers['list-unsubscribe-post']);

    const current = this.senders.get(from.email);
    if (!current) {
      this.senders.set(from.email, {
        email: from.email,
        name: from.name,
        domain: from.domain,
        count: 1,
        firstSeen: date,
        lastSeen: date,
        unsubscribeUrl: unsub.url,
        unsubscribeMail: unsub.mail,
        oneClick,
      });
      return true;
    }

    current.count++;
    if (date < current.firstSeen) current.firstSeen = date;

    const isNewest = date >= current.lastSeen;
    if (isNewest) {
      current.lastSeen = date;
      current.name = from.name ?? current.name;
    }

    // the newest unsubscribe info wins, but never replace something with nothing
    const missingUnsub = !current.unsubscribeUrl && !current.unsubscribeMail;
    if (hasUnsub && (isNewest || missingUnsub)) {
      current.unsubscribeUrl = unsub.url;
      current.unsubscribeMail = unsub.mail;
      current.oneClick = oneClick;
    }

    return true;
  }

  get size() {
    return this.senders.size;
  }

  values() {
    return [...this.senders.values()];
  }
}
