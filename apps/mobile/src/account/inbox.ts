import type { InboxItem } from '@nano/contracts';
import type { IconName } from '../components';

/**
 * ACC-04 type icon (WP-27). The inbox contract has no message type, so the icon follows where the message leads.
 * ponytail: href prefixes; add a `type` to the contract if two kinds ever share a destination.
 */
const BY_HREF: [string, IconName][] = [
  ['/visits', 'calendar-check'],
  ['/care', 'calendar-check'],
  ['/offers', 'ticket'],
  ['/pay/receipt', 'receipt'],
  ['/wallet/history', 'receipt'],
  ['/wallet/gift-cards', 'gift'],
  ['/wallet/claim', 'gift'],
  ['/wallet', 'wallet'],
  ['/account/data-request', 'shield-check'],
  ['/account/inbox', 'chat-circle-text'],
  ['/support', 'chat-circle-text'],
];

export function inboxIcon(href: string | null): IconName {
  return BY_HREF.find(([prefix]) => href === prefix || href?.startsWith(`${prefix}/`) || href?.startsWith(`${prefix}?`))?.[1] ?? 'envelope-simple';
}

/** First sentence of the body, the row's summary line ("12D HIFU, Thu 16 Oct, 2:30 pm"). */
export function inboxSummary(m: Pick<InboxItem, 'body'>): string {
  return m.body.split(/\.\s/)[0]!.replace(/\.$/, '').trim();
}
