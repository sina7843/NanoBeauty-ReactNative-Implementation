import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { setReturnTo } from '../../auth/flow';
import { Banner, Button, EmptyState, ListGroup, ListRow, Screen, Skeleton } from '../../components';
import { t } from '../../i18n';
import { clinicDate, clinicTime } from '../../i18n/format';
import { InstrumentRow } from '../../payments/InstrumentView';
import { useWallet } from '../../payments/queries';
import { useSettings } from '../../settings/useSettings';

/** WAL-01 (full, reconciling, offline, empty, guest). Only server-confirmed balances; never a local guess. */
export default function Wallet() {
  const router = useRouter();
  const { status } = useAuth();
  return (
    <Screen tabbed title={t('wal.title')}>
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
    <ListGroup>
      <ListRow icon="package" title={t('wal.buyPackage')} onPress={() => router.push('/wallet/buy-package')} />
      <ListRow icon="gift" title={t('wal.sendGift')} onPress={() => router.push('/wallet/gift/design')} />
      <ListRow icon="ticket" title={t('wal.claim')} onPress={() => router.push('/wallet/claim')} />
    </ListGroup>
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
  const sent = data.instruments.filter((i) => i.role === 'sender');
  const open = (href: Href) => router.push(href);
  return (
    <>
      {source === 'cache' ? (
        <Banner tone="offline" title={t('wal.offline')}>
          {t('wal.asOf', { time: `${clinicDate(savedAt, zone)}, ${clinicTime(savedAt, zone)}` })}
        </Banner>
      ) : null}
      {owned.some((i) => i.status === 'reconciling') ? (
        <Banner tone="info" title={t('wal.reconciling')}>
          {t('wal.reconcilingNote')}
        </Banner>
      ) : null}
      {owned.length ? (
        <ListGroup>{owned.map((i) => <InstrumentRow key={i.id} instrument={i} zone={zone} onOpen={open} />)}</ListGroup>
      ) : (
        <EmptyState icon="wallet" title={t('wal.empty.title')}>
          {t('wal.empty.body')}
        </EmptyState>
      )}
      {sent.length ? <ListGroup header={t('wal.sentGifts')}>{sent.map((i) => <InstrumentRow key={i.id} instrument={i} zone={zone} onOpen={open} />)}</ListGroup> : null}
      {actions}
      <ListGroup>
        <ListRow icon="receipt" title={t('wal.history')} onPress={() => router.push('/wallet/history')} />
        {owned.length ? <ListRow icon="question" title={t('wal.help')} onPress={() => router.push('/wallet/help')} /> : null}
      </ListGroup>
    </>
  );
}
