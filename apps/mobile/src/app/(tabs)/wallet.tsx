import { space } from '@nano/design-tokens';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { setReturnTo } from '../../auth/flow';
import { Banner, Button, CreditRow, EmptyState, IconButton, ListGroup, ListRow, Screen, Skeleton, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate, clinicDateLong, clinicTime } from '../../i18n/format';
import { InstrumentRow, shown } from '../../payments/InstrumentView';
import { useWallet } from '../../payments/queries';
import { useSettings } from '../../settings/useSettings';

/** WAL-01 (full, reconciling, offline, empty, guest). Only server-confirmed balances; never a local guess. */
export default function Wallet() {
  const router = useRouter();
  const { status } = useAuth();
  return (
    <Screen tabbed title={t('wal.title')} trailing={status === 'signedIn' ? <IconButton icon="user-circle" label={t('nav.account')} variant="tonal" onPress={() => router.push('/account')} /> : undefined}>
      {status === 'guest' ? (
        <EmptyState
          icon="wallet"
          title={t('wal.your')}
          actions={
            <>
              <Button
                fullWidth
                onPress={() => {
                  setReturnTo('/wallet');
                  router.push('/auth/phone');
                }}
              >
                {t('home.signIn')}
              </Button>
              <Button variant="secondary" fullWidth icon="gift" onPress={() => router.push('/wallet/gift/design')}>
                {t('wal.sendGift')}
              </Button>
            </>
          }
        >
          {t('wal.guest.body')}
        </EmptyState>
      ) : status === 'signedIn' ? (
        <SignedIn />
      ) : null}
    </Screen>
  );
}

function SignedIn() {
  const router = useRouter();
  const wallet = useWallet();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const actions = (
    <View style={styles.actions}>
      <View style={styles.flex}>
        <Button variant="secondary" icon="package" fullWidth onPress={() => router.push('/wallet/buy-package')}>
          {t('wal.buyPackage')}
        </Button>
      </View>
      <View style={styles.flex}>
        <Button variant="secondary" icon="gift" fullWidth onPress={() => router.push('/wallet/gift/design')}>
          {t('wal.sendGiftShort')}
        </Button>
      </View>
    </View>
  );
  if (!wallet.data) {
    return wallet.isError ? (
      <>
        <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => wallet.refetch()}>{t('error.retry')}</Button>}>
          {t('error.body')}
        </Banner>
        {actions}
      </>
    ) : (
      <Skeleton lines={4} media={false} />
    );
  }
  const { data, source, savedAt } = wallet.data;
  const owned = data.instruments.filter((i) => i.role === 'owner');
  const credits = owned.filter((i) => i.kind === 'credit');
  const others = owned.filter((i) => i.kind !== 'credit');
  const sent = data.instruments.filter((i) => i.role === 'sender');
  const open = (href: Href) => router.push(href);
  const history = <ListRow icon="receipt" title={t('wal.history')} onPress={() => router.push('/wallet/history')} />;
  return (
    <>
      {source === 'cache' ? (
        <Banner tone="offline" title={t('wal.offline')}>
          {t('wal.asOf', { time: `${clinicDate(savedAt, zone)}, ${clinicTime(savedAt, zone)}` })}
        </Banner>
      ) : null}
      {others.some((i) => i.status === 'reconciling') ? (
        <Banner tone="info" title={t('wal.reconciling')}>
          {t('wal.reconcilingNote')}
        </Banner>
      ) : null}
      {/* WP-7: clinic credit is the CreditRow panel (never bank-card styling); it opens WAL-02. */}
      {credits.map((i) => (
        <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={`${t('wal.credit')}, ${shown(i)}`} onPress={() => open({ pathname: '/wallet/credit', params: { id: i.id } })}>
          <CreditRow
            available={(i.balanceCents ?? 0) / 100}
            reconciling={i.status === 'reconciling' || i.balanceCents === null}
            expires={i.expiresAt && i.status === 'active' ? clinicDateLong(i.expiresAt, zone) : undefined}
          />
        </Pressable>
      ))}
      {owned.length ? (
        <ListGroup>
          {others.map((i) => (
            <InstrumentRow key={i.id} instrument={i} zone={zone} onOpen={open} />
          ))}
          {history}
        </ListGroup>
      ) : (
        <EmptyState icon="wallet" title={t('wal.empty.title')}>
          {t('wal.empty.body')}
        </EmptyState>
      )}
      {sent.length ? <ListGroup header={t('wal.sentGifts')}>{sent.map((i) => <InstrumentRow key={i.id} instrument={i} zone={zone} onOpen={open} />)}</ListGroup> : null}
      {!owned.length ? <ListGroup>{history}</ListGroup> : null}
      {actions}
      {owned.length ? (
        <Pressable accessibilityRole="link" hitSlop={12} onPress={() => router.push('/wallet/help')} style={styles.link}>
          <Text variant="label" tone="primary">
            {t('wal.help')}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: space['3'] },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
