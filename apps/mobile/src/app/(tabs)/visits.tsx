import { useRouter } from 'expo-router';
import { Button, NotBuiltYet, Screen } from '../../components';
import { t } from '../../i18n';

/** Every Home, Treatments and Visits screen carries one violet Book button (TabBar README, D28). */
export default function Visits() {
  const router = useRouter();
  return (
    <Screen tabbed
      title={t('tab.visits')}
      footer={
        <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
          {t('home.book')}
        </Button>
      }
    >
      <NotBuiltYet screen="VIS-01 Visits" prompt="NANO-04" />
    </Screen>
  );
}
