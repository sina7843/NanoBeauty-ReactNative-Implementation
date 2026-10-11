import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Banner, MemberStatus, Screen } from '../../components';
import { t } from '../../i18n';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { InstrumentGate } from '../../payments/InstrumentView';
import { useSettings } from '../../settings/useSettings';

/** `/wallet/membership?id=` — WAL-05. Exists only for legacy members while `features.legacyMembership` is on (D38). */
export default function Membership() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const features = useSettings().data?.data.features;
  if (!features?.legacyMembership || !id) return <Redirect href={OLD_LINK_HREF} />;
  return (
    <>
      <Stack.Screen options={{ title: t('mem.title') }} />
      <Screen topInset={false}>
        <InstrumentGate id={id}>
          {({ instrument: i }) => (
            <>
              {/* WP-17: the tier is the membership's label; benefits are applied by the clinic at the visit. */}
              <MemberStatus tier={i.label} onQuestions={() => router.push({ pathname: '/support/contact', params: { topic: t('mem.topic') } })} />
              <Banner tone="info" title={t('wal.fromOld')}>
                {t('mem.body')}
              </Banner>
            </>
          )}
        </InstrumentGate>
      </Screen>
    </>
  );
}
