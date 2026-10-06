import type { Instrument, InstrumentDetail, LedgerLine } from '@nano/contracts';
import { Redirect, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import { SignInGate } from '../auth/SignInGate';
import { Banner, Button, ListGroup, ListRow, Skeleton } from '../components';
import { t } from '../i18n';
import { clinicDate, clinicTime } from '../i18n/format';
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
      ? i.gift.delivery === 'scheduled' && i.gift.sendAt
        ? t('wal.giftScheduled', { date: `${clinicDate(i.gift.sendAt, zone)}, ${clinicTime(i.gift.sendAt, zone)}` })
        : t('wal.giftSent', { name: i.gift.recipientName })
      : i.kind === 'gift_card' && i.last4
        ? `•••• ${i.last4}`
        : i.source === 'legacy'
          ? t('wal.fromOld')
          : i.expiresAt && i.status === 'active'
            ? t('wal.useBy', { date: clinicDate(i.expiresAt, zone) })
            : undefined;
  const href: Href =
    i.kind === 'package'
      ? (`/wallet/packages/${i.id}` as Href)
      : i.kind === 'gift_card'
        ? (`/wallet/gift-cards/${i.id}` as Href)
        : i.kind === 'membership'
          ? '/wallet/membership'
          : { pathname: '/wallet/credit', params: { id: i.id } };
  return (
    <ListRow
      icon={i.kind === 'package' ? 'package' : i.kind === 'gift_card' ? 'gift' : i.kind === 'membership' ? 'star' : 'wallet'}
      title={i.kind === 'credit' ? t('wal.credit') : i.kind === 'membership' ? t('wal.membership') : i.label}
      subtitle={subtitle}
      value={value}
      onPress={() => open(href)}
    />
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
export function LedgerLines({ lines, zone, header = t('wal.historyTitle') }: { lines: LedgerLine[]; zone: string; header?: string }) {
  if (!lines.length) return null;
  return (
    <ListGroup header={header}>
      {lines.map((l, i) => (
        <ListRow
          key={`${l.createdAt}-${i}`}
          title={l.label}
          subtitle={[clinicDate(l.createdAt, zone), l.reference].filter(Boolean).join(' · ')}
          value={lineValue(l)}
          chevron={false}
        />
      ))}
    </ListGroup>
  );
}

export function Terms({ terms }: { terms: string[] }) {
  if (!terms.length) return null;
  return (
    <ListGroup header={t('wal.terms')}>
      {terms.map((line) => (
        <ListRow key={line} title={line} chevron={false} />
      ))}
    </ListGroup>
  );
}

export const shown = (i: Instrument) => (i.balanceCents !== null ? cents(i.balanceCents) : i.status === 'reconciling' ? t('wal.reconciling') : '');
