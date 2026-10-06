import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Button, IconButton, NotBuiltYet, Screen } from '../../components';
import { t } from '../../i18n';
import { useIsOnline } from '../../lib/network';

/** HOM-01..03 are NANO-03; this shell carries the Option B chrome, offline and old-link states. */
export default function Home() {
  const router = useRouter();
  const online = useIsOnline();
  const { status } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  return (
    <Screen tabbed
      trailing={
        status === 'signedIn' ? (
          <IconButton icon="user-circle" label={t('nav.account')} onPress={() => router.push('/account')} />
        ) : status === 'guest' ? (
          // Guests browse freely (AUTH 01); sign-in is offered, never forced (Main board).
          <Button variant="tertiary" size="sm" onPress={() => router.push('/auth/phone')}>
            {t('home.signIn')}
          </Button>
        ) : null
      }
      footer={
        <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
          {t('home.book')}
        </Button>
      }
    >
      {notice === 'oldlink' ? (
        <Banner tone="info" title={t('link.notFound.title')} onDismiss={() => router.setParams({ notice: undefined })}>
          {t('link.notFound.body')}
        </Banner>
      ) : null}
      {online === false ? <Banner tone="offline" title={t('offline.title')}>{t('offline.banner')}</Banner> : null}
      <NotBuiltYet screen="HOM-01 Home" prompt="NANO-03" />
    </Screen>
  );
}
