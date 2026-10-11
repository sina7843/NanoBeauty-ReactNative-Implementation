import type { Instrument, InstrumentDetail, LedgerLine } from '@nano/contracts';
import { Redirect, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { SignInGate } from '../auth/SignInGate';
import { Pressable, StyleSheet } from 'react-native';
import { Banner, Button, ListGroup, ListRow, Skeleton, Text, type GiftCardStatus, type IconName } from '../components';
import { t } from '../i18n';
import { clinicDateLong, clinicTime } from '../i18n/format';
import { OLD_LINK_HREF } from '../navigation/routes';
import { cents, useInstrument } from './queries';

/** One Wallet row (WAL-01): value from the server, never computed here. */
export function InstrumentRow({ instrument: i, zone, onOpen: open }: { instrument: Instrument; zone: string; onOpen: (href: Href) => void }) {
  const value =
    i.status === 'reconciling'
      ? t('wal.reconciling')
      : i.status === 'ended'
        ? t('wal.ended')
        : i.kind === 'package' && i.sessions
          ? t('wal.sessionsLeft', { remaining: i.sessions.remaining, total: i.sessions.total })
          : i.balanceCents !== null
            ? cents(i.balanceCents)
            : undefined;
  const subtitle =
    i.role === 'sender' && i.gift
      ? sentGiftLine(i, zone)
      : i.kind === 'gift_card' && i.last4
        ? `•••• ${i.last4}`
        : i.source === 'legacy'
          ? t('wal.fromOld')
          : i.expiresAt && i.status === 'active'
            ? t('wal.useBy', { date: clinicDateLong(i.expiresAt, zone) })
            : undefined;
  const href: Href =
    i.kind === 'package'
      ? (`/wallet/packages/${i.id}` as Href)
      : i.kind === 'gift_card'
        ? (`/wallet/gift-cards/${i.id}` as Href)
        : i.kind === 'membership'
          ? { pathname: '/wallet/membership', params: { id: i.id } }
          : { pathname: '/wallet/credit', params: { id: i.id } };
  return (
    <ListRow
      icon={i.kind === 'package' ? 'package' : i.kind === 'gift_card' ? 'gift' : i.kind === 'membership' ? 'seal-check' : 'wallet'}
      title={i.kind === 'credit' ? t('wal.credit') : i.kind === 'membership' ? t('wal.membership') : i.label}
      subtitle={subtitle}
      value={value}
      onPress={() => open(href)}
    />
  );
}


/** Within this of its expiry a package or credit counts as expiring soon (WAL-02/03). */
export const EXPIRING_SOON_MS = 30 * 24 * 3600_000;

/** WAL-03 state from the server's numbers: used up, expired (sessions left past the date), expiring soon, active. */
export function packageState(i: Instrument, now: number): 'active' | 'expiring' | 'expired' | 'used' {
  if (i.sessions && i.sessions.remaining <= 0) return 'used';
  const expiresAt = i.expiresAt ? Date.parse(i.expiresAt) : null;
  if (expiresAt !== null && expiresAt <= now) return 'expired';
  if (expiresAt !== null && expiresAt - now < EXPIRING_SOON_MS) return 'expiring';
  return 'active';
}

/** WP-3: a sent gift's line follows its real delivery state; only a delivered gift says "Sent to {name}". */
export function sentGiftLine(i: Instrument, zone: string): string {
  const g = i.gift!;
  const status = sentGiftStatus(i);
  if (status === 'refunded') return t('wal.giftCancelled', { name: g.recipientName });
  if (status === 'claimed') return t('wal.giftClaimed', { name: g.recipientName });
  if (status === 'scheduled') return g.sendAt ? t('wal.giftScheduled', { date: `${clinicDateLong(g.sendAt, zone)}, ${clinicTime(g.sendAt, zone)}` }) : t('wal.giftFor', { name: g.recipientName });
  if (g.delivery === 'failed') return t('wal.giftFailed', { name: g.recipientName });
  return t('wal.giftSent', { name: g.recipientName });
}

/** The GiftCard badge for the buyer of a gift; a failed text has no badge (its own danger banner says so). */
export function sentGiftStatus(i: Instrument): GiftCardStatus | undefined {
  const g = i.gift;
  if (!g) return undefined;
  if (i.status === 'voided' || g.delivery === 'cancelled') return 'refunded';
  if (g.claimedAt) return 'claimed';
  if (g.delivery === 'scheduled') return 'scheduled';
  if (g.delivery === 'sent') return 'sent';
  return undefined;
}

/** Inline text link ("Something's wrong with …", "Package terms"), 44 pt target. */
export function HelpLink({ onPress, children }: { onPress: () => void; children: string }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={12} onPress={onPress} style={styles.link}>
      <Text variant="label" tone="primary">
        {children}
      </Text>
    </Pressable>
  );
}

/** Loads one instrument (owner or the gift's sender); unknown or someone else's → old-link note. */
export function InstrumentGate({ id, children }: { id: string | undefined; children: (detail: InstrumentDetail) => ReactNode }) {
  return (
    <SignInGate>
      <Load id={id}>{children}</Load>
    </SignInGate>
  );
}

function Load({ id, children }: { id: string | undefined; children: (detail: InstrumentDetail) => ReactNode }) {
  const q = useInstrument(id);
  if (q.error instanceof ApiError && q.error.code === 'not_found') return <Redirect href={OLD_LINK_HREF} />;
  if (q.data) return <>{children(q.data)}</>;
  return q.isError ? (
    <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => q.refetch()}>{t('error.retry')}</Button>}>
      {t('error.body')}
    </Banner>
  ) : (
    <Skeleton lines={4} media={false} />
  );
}

const lineValue = (l: LedgerLine) =>
  l.amountCents !== null ? `${l.amountCents > 0 ? '+' : '−'}${cents(Math.abs(l.amountCents))}` : `${l.sessions! > 0 ? '+' : '−'}${Math.abs(l.sessions!)}`;

/** Ledger lines with references (WALT 08); the balance above them is the server's sum of these. */
export function LedgerLines({ lines, zone, header = t('wal.historyTitle'), icon }: { lines: LedgerLine[]; zone: string; header?: string; icon?: IconName }) {
  if (!lines.length) return null;
  return (
    <ListGroup header={header}>
      {lines.map((l, i) => (
        <ListRow
          key={`${l.createdAt}-${i}`}
          icon={icon}
          title={l.label}
          subtitle={[clinicDateLong(l.createdAt, zone), l.reference].filter(Boolean).join(' · ')}
          value={lineValue(l)}
          chevron={false}
        />
      ))}
    </ListGroup>
  );
}

/**
 * Terms as a text link that opens the server's terms in place (WP-16, D-N12-F3): there is no package-terms help
 * article to link to, and the terms are per package.
 */
export function Terms({ terms, label = t('wal.terms') }: { terms: string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!terms.length) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={12} onPress={() => setOpen((o) => !o)} style={styles.link}>
        <Text variant="label" tone="primary">
          {label}
        </Text>
      </Pressable>
      {open ? (
        <ListGroup>
          {terms.map((line) => (
            <ListRow key={line} title={line} chevron={false} />
          ))}
        </ListGroup>
      ) : null}
    </>
  );
}

export const shown = (i: Instrument) => (i.balanceCents !== null ? cents(i.balanceCents) : i.status === 'reconciling' ? t('wal.reconciling') : '');

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
