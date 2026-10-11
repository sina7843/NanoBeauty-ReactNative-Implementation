import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Button, PermissionNotice, useToast } from '../../components';
import { t } from '../../i18n';
import { permissionPhrase } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';

/**
 * `/staff/denied?permission=` — STF-14. Only a real missing permission lands here (ST-7); the server is the authority.
 * "Ask an admin" says who can change access: there is no access-request API, so nothing is sent.
 */
export default function Denied() {
  const router = useRouter();
  const toast = useToast();
  const { me } = useAuth();
  const { permission } = useLocalSearchParams<{ permission?: string }>();
  return (
    <StaffScreen title={t('stf.denied.title')} back={null}>
      <PermissionNotice action={permissionPhrase(permission)} role={me?.roles.join(' + ') || '—'} onAskAdmin={() => toast({ tone: 'info', message: t('permission.askHow') })} />
      <Button variant="secondary" onPress={() => router.replace('/staff')}>
        {t('stf.denied.back')}
      </Button>
    </StaffScreen>
  );
}
