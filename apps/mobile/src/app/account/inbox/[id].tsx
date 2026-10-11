import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ApiError } from '../../../api/client';
import { SignInGate } from '../../../auth/SignInGate';
import { useInboxItem } from '../../../account/queries';
import { Banner, Button, Screen, Skeleton, Text } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { inboxIcon } from '../../../account/inbox';
import { OLD_LINK_HREF } from '../../../navigation/routes';
import { useSettings } from '../../../settings/useSettings';

/** `/account/inbox/[id]` — ACC-05. Opening a message marks it read on the server. */
export default function Message() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('inbox.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <Detail id={id} />
        </SignInGate>
      </Screen>
    </>
  );
}

function Detail({ id }: { id: string | undefined }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const item = useInboxItem(id);
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const read = !!item.data;
  useEffect(() => {
    if (read) queryClient.invalidateQueries({ queryKey: ['inbox'], exact: true });
  }, [read, queryClient]);

  if (item.error instanceof ApiError && item.error.code === 'not_found') return <Redirect href={OLD_LINK_HREF} />;
  if (!item.data) {
    return item.isError ? (
      <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => item.refetch()}>{t('error.retry')}</Button>}>
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={3} media={false} />
    );
  }
  const m = item.data;
  return (
    <>
      <Text variant="caption" tone="inkMuted">
        {clinicDateTime(m.createdAt, zone)}
      </Text>
      <Text variant="titleLg" accessibilityRole="header">
        {m.title}
      </Text>
      <Text variant="bodyLg">{m.body}</Text>
      {m.href && m.hrefLabel ? (
        <Button variant="secondary" icon={inboxIcon(m.href)} fullWidth onPress={() => router.push(m.href as Href)}>
          {m.hrefLabel}
        </Button>
      ) : null}
    </>
  );
}
