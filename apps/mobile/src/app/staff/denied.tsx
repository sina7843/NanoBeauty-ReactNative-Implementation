import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Button, PermissionNotice } from '../../components';
import { t } from '../../i18n';
import { StaffScreen } from '../../staff/StaffScreen';

/** `/staff/denied?permission=` — STF-14. Shown when the server answered 403; the server is the authority. */
export default function Denied() {
  const router = useRouter();
  const { me } = useAuth();
  const { permission } = useLocalSearchParams<{ permission?: string }>();
  const action = permission && /^[a-z.A-Z]{3,40}$/.test(permission) ? permission : t('stf.denied.title').toLowerCase();
  return (
    <StaffScreen title={t('stf.denied.title')} back={null}>
      <PermissionNotice action={action} role={me?.roles.join(' + ') || '—'} />
      <Button variant="secondary" onPress={() => router.replace('/staff')}>
        {t('stf.denied.back')}
      </Button>
    </StaffScreen>
  );
}
