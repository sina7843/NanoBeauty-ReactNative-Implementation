import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen, SupportContext } from '../../components';
import { hoursLabel, isOpenNow } from '../../content/clinic';
import { t } from '../../i18n';
import { useSettings } from '../../settings/useSettings';

/**
 * `/support/contact` — SUP-03 contextual help (SUP 02–04): the reference travels with the person so they don't
 * explain from scratch. Open/closed is only claimed when the clinic has published its hours.
 */
export default function SupportContact() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reference?: string; topic?: string }>();
  // Display only; accept reference-shaped values so a link can't inject arbitrary text.
  const reference = /^[A-Z0-9-]{4,24}$/.test(params.reference ?? '') ? params.reference : undefined;
  const topic = params.topic && params.topic.length <= 60 ? params.topic : undefined;
  const settings = useSettings().data?.data;
  const [now] = useState(() => Date.now());
  const hours = settings?.settings.clinicHours ?? null;
  const open = settings ? isOpenNow(hours, settings.clinic.timezone, now) : null;
  const reply = settings?.clinic.supportReplyTime;
  return (
    <>
      <Stack.Screen options={{ title: t('sup.contactTitle') }} />
      <Screen topInset={false}>
        <SupportContext
          topic={topic ?? t('support.generalTopic')}
          reference={reference}
          hours={hoursLabel(hours) ?? t('sup.hoursPending')}
          response={reply ? t('sup.replies', { time: reply }) : undefined}
          phone={settings?.clinic.phone ?? null}
          open={open}
          onAsk={() => router.push('/support/ask')}
        />
      </Screen>
    </>
  );
}
