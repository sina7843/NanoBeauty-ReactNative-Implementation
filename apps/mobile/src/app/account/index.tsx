import { Redirect, router } from 'expo-router';
import { ListGroup, ListRow, NotBuiltYet, Screen } from '../../components';
import { useAuth } from '../../auth/AuthProvider';
import { t } from '../../i18n';

/** ACC-01 (NANO-05). Sign out is live now so sessions can be revoked (AUTH 03, AUTH 05). */
export default function Account() {
  const { status, signOut } = useAuth();
  if (status === 'guest') return <Redirect href="/auth/phone" />;
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="ACC-01 Account" prompt="NANO-05" />
      <ListGroup>
        <ListRow
          title={t('account.signOut')}
          chevron={false}
          onPress={async () => {
            await signOut();
            router.dismissTo('/home');
          }}
        />
      </ListGroup>
    </Screen>
  );
}
