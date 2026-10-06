import { Redirect, Stack } from 'expo-router';
import { Badge, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';

/** `/wallet/membership` — WAL-05. Exists only for legacy members while `features.legacyMembership` is on (D38). */
export default function Membership() {
  const features = useSettings().data?.data.features;
  if (!features?.legacyMembership) return <Redirect href={OLD_LINK_HREF} />;
  return (
    <>
      <Stack.Screen options={{ title: t('mem.title') }} />
      <Screen topInset={false}>
        <Badge tone="info">{t('wal.fromOld')}</Badge>
        <Text variant="body">{t('mem.body')}</Text>
      </Screen>
    </>
  );
}
