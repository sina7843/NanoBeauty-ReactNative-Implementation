import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncStatus, Button, Screen } from '../../../components';
import { t } from '../../../i18n';
import { useSettings } from '../../../settings/useSettings';

const HOW = { text: 'ask.how.text', email: 'ask.how.email', app: 'ask.how.app' } as const;

/** `/support/ask/sent` — SUP-05. Reached only after the server stored the question and returned a reference. */
export default function AskSent() {
  const router = useRouter();
  const { reference, channel } = useLocalSearchParams<{ reference: string; channel: keyof typeof HOW }>();
  const reply = useSettings().data?.data.clinic.supportReplyTime ?? '';
  // Only a server-issued reference shows success; a hand-typed link can't fake a sent question.
  if (!/^SUP-[0-9A-F]{6}$/.test(reference ?? '') || !(channel in HOW)) return <Redirect href="/support" />;
  return (
    <>
      <Stack.Screen options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
      <Screen
        topInset={false}
        footer={
          <>
            <Button size="lg" fullWidth onPress={() => router.dismissTo('/support')}>
              {t('ask.done')}
            </Button>
            <Button variant="tertiary" fullWidth onPress={() => router.push('/account/inbox')}>
              {t('ask.openInbox')}
            </Button>
          </>
        }
      >
        <AsyncStatus state="success" title={t('ask.sent.title')} reference={reference}>
          {t('ask.sent.body', { how: t(HOW[channel] ?? HOW.text), time: reply })}
        </AsyncStatus>
      </Screen>
    </>
  );
}
