import type { Channel, InboxItem, NtfId } from '@nano/contracts';

// NANO-09 notification templates (spec 3). One registry: inbox wording, push/text/email copy and channels.

/** Inbox wording per customer notification template (ACC-04/05). Unknown templates are not shown. */
export const INBOX: Record<string, (d: Record<string, string>) => Omit<InboxItem, 'id' | 'createdAt' | 'read'>> = {
  visit_request_submitted: (d) => ({
    title: 'Request sent to the clinic',
    body: `Reference ${d.reference}. The clinic will reply by text; your visit stays as it is until they confirm.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'See your visit' : null,
  }),
  'NTF-03.visit_request_approved': (d) => ({
    title: 'Your change was approved',
    body: `Reference ${d.reference}. Open your visit to see the latest details.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'See your visit' : null,
  }),
  visit_request_declined: (d) => ({
    title: 'The clinic couldn’t make that change',
    body: `Reference ${d.reference}.${d.reason ? ` ${d.reason}` : ''} Your visit stays as it was.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'Need to change it?' : null,
  }),
  visit_request_call_needed: (d) => ({
    title: 'The clinic would like to talk',
    body: `Reference ${d.reference}. They’ll call you, or you can call them.`,
    href: '/support/contact',
    hrefLabel: 'Contact the clinic',
  }),
  payment_receipt: (d) => ({
    title: 'Payment received',
    body: `Reference ${d.reference}. Your receipt is in your Wallet.`,
    href: d.orderId ? `/pay/receipt/${d.orderId}` : null,
    hrefLabel: d.orderId ? 'View receipt' : null,
  }),
  refund_status: (d) => ({
    title: d.status === 'succeeded' ? 'Refund sent' : 'Refund didn’t go through',
    body:
      d.status === 'succeeded'
        ? `Reference ${d.reference}. It can take up to 5 business days to show on your statement.`
        : `Reference ${d.reference}. The clinic will contact you; nothing has been lost.`,
    href: d.orderId ? `/pay/receipt/${d.orderId}` : null,
    hrefLabel: d.orderId ? 'View receipt' : null,
  }),
  gift_scheduled: (d) => ({
    title: `Gift card for ${d.name}`,
    body: 'Paid. We’ll text it at the time you chose.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  gift_sent: (d) => ({
    title: `Gift card sent to ${d.name}`,
    body: 'They got a link and a code by text.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  gift_claimed: (d) => ({
    title: `${d.name} added your gift card`,
    body: 'It’s now in their Wallet.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  'NTF-09.package_session_used': (d) => ({
    title: 'Package session used',
    body: `${d.label}${d.reference ? ` · ${d.reference}` : ''}.`,
    href: d.instrumentId ? `/wallet/packages/${d.instrumentId}` : null,
    hrefLabel: 'See your package',
  }),
  value_used: (d) => ({
    title: 'Balance used at your visit',
    body: `${d.label}${d.reference ? ` · ${d.reference}` : ''}.`,
    href: '/wallet',
    hrefLabel: 'Open Wallet',
  }),
  'NTF-10.support_reply': (d) => ({
    title: 'The clinic replied',
    body: `Reference ${d.reference}. ${d.message}`,
    href: '/support',
    hrefLabel: 'Ask another question',
  }),
  gift_voided: () => ({
    title: 'A gift card was cancelled',
    body: 'The clinic cancelled this gift card. Contact them if you have questions.',
    href: '/support/contact',
    hrefLabel: 'Contact the clinic',
  }),
  data_request_received: (d) => ({
    title: 'We’re preparing your data',
    body: `Reference ${d.reference}. We’ll email you when it’s ready, usually within 30 days.`,
    href: '/account/data-request',
    hrefLabel: 'See your request',
  }),
};

/** Copy for the NANO-09 triggers (visit seen/changed/cancelled in the Fresha read-back, app reminders). */
Object.assign(INBOX, {
  'NTF-01.booking_confirmed': (d: Record<string, string>) => ({
    title: 'Booking confirmed',
    body: `${d.service}, ${d.when}. See you then.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: 'See your visit',
  }),
  'NTF-02.reminder': (d: Record<string, string>) => ({
    title: 'Visit reminder',
    body: `${d.service}, ${d.when}. Need to change it? Open your visit.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: 'See your visit',
  }),
  'NTF-03.visit_changed': (d: Record<string, string>) => ({
    title: 'Your visit changed',
    body: `${d.service} is now ${d.when}.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: 'See your visit',
  }),
  'NTF-04.visit_cancelled': (d: Record<string, string>) => ({
    title: 'Visit cancelled',
    body: `${d.service}, ${d.when}, was cancelled. Any deposit follows the clinic’s policy.`,
    href: d.visitId ? `/visits/${d.visitId}/cancelled` : null,
    hrefLabel: 'See what happens next',
  }),
});

/** Staff push copy (NTF-11, NTF-12 and the staff alerts). Opens the screen that needs them. */
export const STAFF_COPY: Record<string, (d: Record<string, string>) => { title: string; body: string; href: string }> = {
  'NTF-11.request_needs_you': (d) => ({ title: 'A request needs you', body: `Reference ${d.reference ?? ''}`.trim(), href: d.requestId ? `/staff/requests/${d.requestId}` : '/staff/today' }),
  'NTF-12.approval_needed': (d) => ({ title: 'Approval needed', body: d.item ?? '', href: '/staff/approvals' }),
  approval_approved: (d) => ({ title: 'Published', body: d.item ?? '', href: '/staff' }),
  approval_sent_back: (d) => ({ title: 'Sent back to you', body: `${d.item ?? ''}${d.reason ? `: ${d.reason}` : ''}`, href: '/staff' }),
  approval_withdrawn: (d) => ({ title: 'Approval withdrawn', body: d.item ?? '', href: '/staff/approvals' }),
  balance_help: (d) => ({ title: 'Balance question', body: `Reference ${d.reference ?? ''}`, href: '/staff/lookup' }),
  privacy_request: (d) => ({ title: d.kind === 'delete' ? 'Account deletion requested' : 'Data export requested', body: `Reference ${d.reference ?? ''}`, href: '/staff/customers' }),
  duplicate_refund_needs_attention: (d) => ({ title: 'Refund needs attention', body: `Payment ${d.attempt ?? ''}`, href: '/staff' }),
  voided_gift_refund_failed: (d) => ({ title: 'Refund for a voided gift card failed', body: `Reference ${d.reference ?? ''}`, href: d.instrumentId ? `/staff/gift-cards/${d.instrumentId}` : '/staff/gift-cards' }),
};

export type DeliveryKind = 'transactional' | 'reminder' | 'staff';
export interface DeliverySpec {
  ntf: NtfId | null;
  kind: DeliveryKind;
  channels: Channel[];
  /** Answers something the person just did (receipt, counter use): not held back by quiet hours. */
  urgent?: boolean;
}

/**
 * Spec 3 channels per outbox template. Templates missing here are inbox-only (the person's own action, e.g. "request
 * sent"). Gift codes (NTF-07) never enter the outbox: the text goes straight to the recipient when the code is made.
 * Support replies (NTF-10) already went out by the channel staff chose; the outbox adds the push.
 */
export const DELIVERY: Record<string, DeliverySpec> = {
  'NTF-01.booking_confirmed': { ntf: 'NTF-01', kind: 'transactional', channels: ['push', 'sms', 'email'] },
  'NTF-02.reminder': { ntf: 'NTF-02', kind: 'reminder', channels: ['push', 'sms'] },
  'NTF-03.visit_changed': { ntf: 'NTF-03', kind: 'transactional', channels: ['push', 'sms', 'email'] },
  'NTF-03.visit_request_approved': { ntf: 'NTF-03', kind: 'transactional', channels: ['push', 'sms', 'email'] },
  visit_request_declined: { ntf: null, kind: 'transactional', channels: ['push', 'sms'] },
  visit_request_call_needed: { ntf: null, kind: 'transactional', channels: ['push', 'sms'] },
  'NTF-04.visit_cancelled': { ntf: 'NTF-04', kind: 'transactional', channels: ['push', 'sms', 'email'] },
  payment_receipt: { ntf: 'NTF-05', kind: 'transactional', channels: ['email', 'push'], urgent: true },
  refund_status: { ntf: 'NTF-06', kind: 'transactional', channels: ['push', 'email'] },
  gift_scheduled: { ntf: 'NTF-08', kind: 'transactional', channels: ['push', 'email'], urgent: true },
  gift_sent: { ntf: 'NTF-08', kind: 'transactional', channels: ['push', 'email'] },
  gift_claimed: { ntf: 'NTF-08', kind: 'transactional', channels: ['push'] },
  gift_voided: { ntf: null, kind: 'transactional', channels: ['push', 'email'] },
  'NTF-09.package_session_used': { ntf: 'NTF-09', kind: 'transactional', channels: ['push'], urgent: true },
  value_used: { ntf: 'NTF-09', kind: 'transactional', channels: ['push'], urgent: true },
  'NTF-10.support_reply': { ntf: 'NTF-10', kind: 'transactional', channels: ['push'] },
  'NTF-11.request_needs_you': { ntf: 'NTF-11', kind: 'staff', channels: ['push'], urgent: true },
  'NTF-12.approval_needed': { ntf: 'NTF-12', kind: 'staff', channels: ['push'], urgent: true },
  approval_approved: { ntf: null, kind: 'staff', channels: ['push'] },
  approval_sent_back: { ntf: null, kind: 'staff', channels: ['push'] },
  approval_withdrawn: { ntf: null, kind: 'staff', channels: ['push'] },
  balance_help: { ntf: null, kind: 'staff', channels: ['push'] },
  privacy_request: { ntf: null, kind: 'staff', channels: ['push'] },
  duplicate_refund_needs_attention: { ntf: null, kind: 'staff', channels: ['push'], urgent: true },
  voided_gift_refund_failed: { ntf: null, kind: 'staff', channels: ['push'], urgent: true },
};

/** Text and email links open the app (or the web fallback) at the same path the push opens. */
export const APP_LINK_BASE = 'https://app.nanobeautystar.com';

/** What one channel carries: title, body and the in-app path to open. */
export function render(template: string, data: Record<string, string>): { title: string; body: string; href: string | null } | null {
  const staff = STAFF_COPY[template];
  if (staff) return staff(data);
  const inbox = INBOX[template];
  if (!inbox) return null;
  const v = inbox(data);
  return { title: v.title, body: v.body, href: v.href };
}
