import type { InboxItem } from '@nano/contracts';
import { Stack, useRouter, type Href } from 'expo-router';
import { useAuth } from '../../../auth/AuthProvider';
import { SignInGate } from '../../../auth/SignInGate';
import { useInbox } from '../../../account/queries';
import { Banner, Button, EmptyState, ListGroup, ListRow, Screen, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';

/** `/account/inbox` — ACC-04 (list, empty). Messages stay here after a push is dismissed (NOTIF 05). */
export default function Inbox() {
  return (
    <>
      <Stack.Screen options={{ title: t('inbox.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <List />
        </SignInGate>
      </Screen>
    </>
  );
}

function List() {
  const router = useRouter();
  const inbox = useInbox();
  const { status } = useAuth();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  if (status !== 'signedIn') return null;
  if (!inbox.data) {
    return inbox.isError ? (
      <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => inbox.refetch()}>{t('error.retry')}</Button>}>
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={3} media={false} />
    );
  }
  const { items } = inbox.data;
  if (!items.length) {
    return (
      <EmptyState icon="chat-circle-text" title={t('inbox.empty.title')}>
        {t('inbox.empty.body')}
      </EmptyState>
    );
  }
  const row = (m: InboxItem) => (
    <ListRow
      key={m.id}
      icon={m.read ? 'check-circle' : 'bell'}
      title={m.title}
      subtitle={clinicDateTime(m.createdAt, zone)}
      onPress={() => router.push(`/account/inbox/${m.id}` as Href)}
    />
  );
  const unread = items.filter((m) => !m.read);
  const read = items.filter((m) => m.read);
  return (
    <>
      {unread.length ? <ListGroup header={t('inbox.new')}>{unread.map(row)}</ListGroup> : null}
      {read.length ? <ListGroup header={t('inbox.earlier')}>{read.map(row)}</ListGroup> : null}
    </>
  );
}
