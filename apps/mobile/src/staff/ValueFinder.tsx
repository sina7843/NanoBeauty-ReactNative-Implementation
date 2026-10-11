import { instrumentSchema, lookupResponseSchema, type Instrument } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { newIdempotencyKey } from '../booking/visits';
import { Banner, Button, Card, Dialog, EmptyState, ListGroup, ListRow, Text, TextField, useToast } from '../components';
import { t } from '../i18n';
import { money } from '../i18n/format';
import { ApiError } from '../api/client';
import { problemOf, problemText } from './api';
import { humanize } from './readable';

const valueOf = (i: Instrument) => (i.sessions ? t('redeem.left', { left: `${i.sessions.remaining}/${i.sessions.total}` }) : money((i.balanceCents ?? 0) / 100));

/**
 * STF-11 lookup and STF-25 counter redemption. Nothing is subtracted on the phone: the staff member confirms, the
 * server writes the ledger entry, and the receipt shows the balance the server returned (no optimistic decrement).
 */
export function ValueFinder({ redeem, initialQuery }: { redeem: boolean; /** Lookup → "Redeem at the desk" carries the search over. */ initialQuery?: string }) {
  const { session, me } = useAuth();
  const can = (p: string) => !!me?.permissions.includes(p as never);
  const toast = useToast();
  const [q, setQ] = useState(initialQuery ?? '');
  const [result, setResult] = useState<ReturnType<typeof lookupResponseSchema.parse> | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Instrument | null>(null);
  const [qty, setQty] = useState('');
  const [reference, setReference] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newIdempotencyKey);
  const [receipt, setReceipt] = useState<{ used: string; after: Instrument } | null>(null);

  useEffect(() => {
    if (initialQuery) find();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function find() {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    setReceipt(null);
    setPicked(null);
    try {
      const param = /^[0-9+()\s-]{7,}$/.test(term) ? `phone=${encodeURIComponent(term)}` : `code=${encodeURIComponent(term)}`;
      setResult(lookupResponseSchema.parse((await session.authed(`/v1/staff/lookup?${param}`)).body));
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setSearching(false);
    }
  }

  const n = Number(qty.replace(/[$,\s]/g, ''));
  const valid = picked && Number.isFinite(n) && n > 0 && (picked.sessions ? Number.isInteger(n) && n <= picked.sessions.remaining : Math.round(n * 100) <= (picked.balanceCents ?? 0));
  const what = picked?.sessions ? (n === 1 ? t('redeem.oneSession') : t('redeem.nSessions', { count: n })) : money(n);

  async function confirm() {
    if (!picked || !valid) return;
    setBusy(true);
    try {
      const body = { instrumentId: picked.id, ...(picked.sessions ? { sessions: n } : { amountCents: Math.round(n * 100) }), ...(reference.trim() ? { reference: reference.trim() } : {}), idempotencyKey: key };
      const after = instrumentSchema.parse((await session.authed('/v1/staff/redemptions', { method: 'POST', body })).body);
      setReceipt({ used: what, after });
      setResult((r) => (r ? { ...r, instruments: r.instruments.map((i) => (i.id === after.id ? after : i)) } : r));
      setPicked(null);
      setQty('');
      setReference('');
      setKey(newIdempotencyKey());
    } catch (e) {
      // Same key on retry: a lost response can't redeem twice.
      if (e instanceof ApiError && e.code === 'forbidden') toast({ tone: 'warning', message: t('redeem.self') });
      else toast({ tone: 'danger', message: problemOf(e).kind === 'conflict' ? t('redeem.conflict') : problemText(e) });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <TextField label={t('redeem.find')} value={q} onChangeText={setQ} autoCapitalize="characters" returnKeyType="search" onSubmitEditing={find} />
      <Button variant="secondary" loading={searching} onPress={find}>
        {t('redeem.search')}
      </Button>
      {receipt ? (
        <Card>
          <Text variant="overline" tone="inkMuted">
            {t('redeem.receipt')}
          </Text>
          <Text variant="titleLg">{receipt.after.label}</Text>
          <Text variant="body">{`−${receipt.used} · ${valueOf(receipt.after)}`}</Text>
        </Card>
      ) : null}
      {result && !result.customer && !result.instruments.length ? (
        // ST-15: not found is not the same as "found, nothing to redeem".
        <EmptyState icon="magnifying-glass" title={t('lookup.notFound')}>
          {t('lookup.notFoundBody')}
        </EmptyState>
      ) : null}
      {result?.customer ? (
        <ListGroup header={t('lookup.customer')}>
          <ListRow
            icon="user-circle"
            title={result.customer.name ?? '—'}
            subtitle={result.customer.phoneMasked}
            chevron={can('customers.view')}
            onPress={can('customers.view') ? () => router.push(`/staff/customers/${result.customer!.id}` as Href) : undefined}
          />
        </ListGroup>
      ) : null}
      {result && (result.customer || result.instruments.length) ? (
        <ListGroup header={t('lookup.value')} footer={result.instruments.length ? undefined : t('lookup.noValue')}>
          {result.instruments.map((i) => {
            const giftLink = !redeem && i.kind === 'gift_card' && can('giftcard.actions');
            const pick = redeem && i.status === 'active';
            return (
              <ListRow
                key={i.id}
                icon={i.kind === 'gift_card' ? 'gift' : i.sessions ? 'package' : 'wallet'}
                title={i.label}
                subtitle={[valueOf(i), i.status !== 'active' ? humanize(i.status) : null, i.last4 ? `GC-${i.last4}` : null].filter(Boolean).join(' · ')}
                value={giftLink ? t('lookup.actions') : undefined}
                chevron={pick || giftLink}
                onPress={pick ? () => setPicked(i) : giftLink ? () => router.push(`/staff/gift-cards/${i.id}` as Href) : undefined}
              />
            );
          })}
        </ListGroup>
      ) : null}
      {!redeem && result?.instruments.some((i) => i.status === 'active') && can('value.redeem') ? (
        <Button variant="secondary" icon="wallet" fullWidth onPress={() => router.push({ pathname: '/staff/redeem', params: { q: q.trim() } })}>
          {t('lookup.redeem')}
        </Button>
      ) : null}
      {redeem && picked ? (
        <Card>
          <Text variant="headline">{picked.label}</Text>
          <Text variant="caption" tone="inkMuted">
            {valueOf(picked)}
          </Text>
          <View style={styles.gap}>
            <TextField label={picked.sessions ? t('redeem.sessions') : t('redeem.amount')} value={qty} onChangeText={setQty} keyboardType={picked.sessions ? 'number-pad' : 'decimal-pad'} />
            <TextField label={t('redeem.reference')} value={reference} onChangeText={setReference} maxLength={40} autoCapitalize="characters" />
            <Button disabled={!valid} onPress={() => setConfirming(true)}>
              {t('redeem.confirm')}
            </Button>
          </View>
        </Card>
      ) : null}
      {redeem && !result ? <Banner tone="info" title={t('redeem.confirmBody')} /> : null}
      <Dialog
        visible={confirming}
        title={t('redeem.confirmTitle', { what, label: picked?.label ?? '' })}
        confirmLabel={t('redeem.confirm')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      >
        <Text variant="body" tone="inkMuted">
          {t('redeem.confirmBody')}
        </Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({ gap: { gap: space['3'], marginTop: space['3'] } });
