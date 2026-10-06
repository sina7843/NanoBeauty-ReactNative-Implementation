import { useRouter } from 'expo-router';
import { Button, NotBuiltYet, Screen } from '../../components';
import { t } from '../../i18n';

/** Every Home, Treatments and Visits screen carries one violet Book button (TabBar README, D28). */
export default function Treatments() {
  const router = useRouter();
  return (
    <Screen tabbed
      title={t('tab.treatments')}
      footer={
        <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
          {t('home.book')}
        </Button>
      }
    >
      <NotBuiltYet screen="TRT-01 Treatments" prompt="NANO-03" />
    </Screen>
  );
}
