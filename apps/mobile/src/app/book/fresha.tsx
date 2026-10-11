import { handoffResponseSchema, type VisitsResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Badge, Banner, Button, ListGroup, ListRow, Screen, Text } from '../../components';
import type { Cached } from '../../content/cache';
import { useBasket } from '../../booking/basket';
import { savePendingHandoff } from '../../booking/pendingHandoff';
import { openAndWaitForReturn } from '../../platform/browser';
import { newIdempotencyKey } from '../../booking/visits';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { analytics } from '../../lib/analytics';
import { useIsOnline } from '../../lib/network';
import { useSettings } from '../../settings/useSettings';

/**
 * `/book/fresha` — BKG-08, the hand-off boundary (BOOK 15). Fresha opens in the system in-app browser (not a
 * WebView we control); nothing is booked by this screen, and coming back proves nothing (BKG-09 checks).
 */
export default function FreshaHandoff() {
  const { status } = useAuth();
  return (
    <>
      <Stack.Screen options={{ title: t('bkg.title') }} />
      {status === 'signedIn' ? (
        <Handoff />
      ) : (
        <Screen topInset={false}>
          <SignInGate title={t('fresha.title')} body={t('fresha.signInBody')}>
            {null}
          </SignInGate>
        </Screen>
      )}
    </>
  );
}

function Handoff() {
  const router = useRouter();
  const online = useIsOnline();
  const { session } = useAuth();
  const items = useBasket();
  const catalog = useCatalog().data?.data;
  const phone = useSettings().data?.data.clinic.phone ?? null;
  // One key per visit to this screen: a double tap or a retry after a lost response reuses the same hand-off.
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState(false);
  // BV-5: when Visits already knows the clinic has no Fresha link, say so up front instead of after a tap.
  const knownUrl = useQueryClient().getQueryData<Cached<VisitsResponse>>(['visits'])?.data.freshaUrl;
  const [problem, setProblem] = useState<'failed' | 'notConfigured' | null>(knownUrl === null ? 'notConfigured' : null);
  const names = items.map((i) => catalog?.services.find((s) => s.id === i.serviceId)?.name).filter(Boolean).join(', ');

  async function go() {
    setBusy(true);
    setProblem(null);
    try {
      const res = await session.authed('/v1/bookings/handoffs', {
        method: 'POST',
        body: { items: items.map((i) => (i.areas ? { serviceId: i.serviceId, areas: i.areas } : { serviceId: i.serviceId })), idempotencyKey },
      });
      const handoff = handoffResponseSchema.parse(res.body);
      if (!handoff.url) {
        setProblem('notConfigured');
        return;
      }
      // Saved before leaving: if the app is killed while Fresha is open, the next launch resumes the check.
      await savePendingHandoff({ id: handoff.id, openedAt: Date.now() });
      analytics.track('handoff_opened', { service_ids: items.map((i) => i.serviceId).join(','), first_time: false });
      await openAndWaitForReturn(handoff.url);
      router.replace({ pathname: '/book/fresha-return', params: { handoff: handoff.id } });
    } catch {
      setProblem('failed'); // nothing was opened; the same key makes a retry safe
    } finally {
      setBusy(false);
    }
  }

  const digits = phone?.replace(/[^\d+]/g, '');
  return (
    <Screen
      topInset={false}
      footer={
        <View style={styles.actions}>
          <Button size="lg" fullWidth iconAfter="arrow-square-out" loading={busy} disabled={online === false || problem === 'notConfigured'} onPress={go}>
            {t('fresha.continue')}
          </Button>
          {digits ? (
            <Button variant="tertiary" icon="phone" fullWidth onPress={() => Linking.openURL(`tel:${digits}`).catch(() => undefined)}>
              {t('fresha.call')}
            </Button>
          ) : null}
        </View>
      }
    >
      <Text variant="titleLg" accessibilityRole="header">
        {t('fresha.title')}
      </Text>
      <Text variant="body" tone="inkMuted">
        {t('fresha.body')}
      </Text>
      {online === false ? (
        <Banner tone="offline" title={t('offline.title')}>
          {t('offline.banner')}
        </Banner>
      ) : null}
      {problem === 'notConfigured' ? (
        <Banner tone="info" title={t('fresha.title')}>
          {t('fresha.notConfigured')}
        </Banner>
      ) : null}
      {problem === 'failed' ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      <ListGroup header={t('fresha.carry')}>
        {names ? <ListRow icon="check" title={t('fresha.carry.treatment')} subtitle={names} chevron={false} /> : null}
        <ListRow icon="check" title={t('fresha.carry.contact')} subtitle={t('fresha.carry.contactSub')} chevron={false} />
        <ListRow icon="info" title={t('fresha.carry.time')} subtitle={t('fresha.carry.timeSub')} chevron={false} />
      </ListGroup>
      <Badge tone="sample">{t('fresha.assumption')}</Badge>
      <ListGroup header={t('fresha.expect')}>
        <ListRow icon="arrow-square-out" title={t('fresha.expect.opens')} subtitle={t('fresha.expect.opensSub')} chevron={false} />
        <ListRow icon="calendar-check" title={t('fresha.expect.back')} subtitle={t('fresha.expect.backSub')} chevron={false} />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space['1'] },
});
