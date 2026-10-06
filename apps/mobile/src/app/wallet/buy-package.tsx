import type { Package } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Badge, Banner, Button, Icon, ListGroup, ListRow, Screen, Skeleton, Text } from '../../components';
import { newIdempotencyKey } from '../../booking/visits';
import { ContentGate } from '../../content/ContentGate';
import { usePackages } from '../../content/queries';
import { t } from '../../i18n';
import { createOrder } from '../../payments/checkout';
import { cents } from '../../payments/queries';
import { useTheme } from '../../theme/ThemeProvider';

/** `/wallet/buy-package` — WAL-07 (WALT 05). Prices, savings and validity come from the server's package list. */
export default function BuyPackage() {
  const packages = usePackages();
  return (
    <>
      <Stack.Screen options={{ title: t('buy.title') }} />
      <SignInGate>
        <ContentGate query={packages} skeleton={<Screen topInset={false}><Skeleton lines={4} media={false} /></Screen>}>
          {(list) => <Choose list={list} />}
        </ContentGate>
      </SignInGate>
    </>
  );
}

function Choose({ list }: { list: Package[] }) {
  const router = useRouter();
  const { session } = useAuth();
  const { colors } = useTheme();
  const live = list.filter((p) => p.status === 'live');
  const [chosen, setChosen] = useState<string | null>(live[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [keys] = useState(() => new Map<string, string>());
  const pkg = list.find((p) => p.id === chosen);

  async function go() {
    if (!pkg) return;
    setBusy(true);
    setFailed(false);
    try {
      const key = keys.get(pkg.id) ?? (keys.set(pkg.id, newIdempotencyKey()), keys.get(pkg.id)!);
      const order = await createOrder(session, { kind: 'package', packageId: pkg.id }, key);
      router.push({ pathname: '/pay/method', params: { order: order.id } });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} disabled={!pkg} onPress={go}>
          {t('buy.continue')}
        </Button>
      }
    >
      <Text variant="body" tone="inkMuted">
        {t('buy.body')}
      </Text>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('buy.title')}>
        {list.map((p) => {
          const on = p.id === chosen;
          const live = p.status === 'live';
          const sub = [
            p.regularCents && p.regularCents > p.priceCents ? t('buy.saves', { amount: cents(p.regularCents - p.priceCents) }) : null,
            p.validityMonths ? t('buy.within', { months: p.validityMonths }) : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !live }}
              accessibilityLabel={[p.name, sub, live ? cents(p.priceCents) : t('buy.backSoon')].filter(Boolean).join(', ')}
              disabled={!live}
              onPress={() => setChosen(p.id)}
              style={[styles.row, { borderColor: on ? colors.primary : colors.lineStrong, borderWidth: on ? 2 : 1, opacity: live ? 1 : 0.5 }]}
            >
              <Icon name={on ? 'check-circle' : 'package'} size={22} tone={on ? 'primary' : 'inkMuted'} fill={on} />
              <View style={styles.flex}>
                <Text variant="body" strong>
                  {p.name}
                </Text>
                {sub ? (
                  <Text variant="caption" tone="inkMuted">
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </Text>
                ) : null}
              </View>
              {live ? <Text variant="body">{cents(p.priceCents)}</Text> : <Badge tone="neutral">{t('buy.backSoon')}</Badge>}
            </Pressable>
          );
        })}
      </View>
      {list.some((p) => p.sample) ? (
        <View style={styles.inline}>
          <Badge tone="sample">{t('badge.sample')}</Badge>
          <Text variant="caption" tone="inkMuted" style={styles.flex}>
            {t('buy.samplePrices')}
          </Text>
        </View>
      ) : null}
      <ListGroup>
        <ListRow icon="calendar-check" title={t('buy.howTitle')} subtitle={t('buy.howSub')} chevron={false} />
        <ListRow icon="receipt" title={t('pkg.terms')} subtitle={pkg?.terms.join(' ') ?? t('buy.termsSub')} chevron={false} />
      </ListGroup>
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space['2'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 64, paddingHorizontal: space['4'], paddingVertical: space['3'], borderRadius: radius.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
});
