import { supportQuestionResponseSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { setReturnTo } from '../../../auth/flow';
import { Banner, Button, Chip, Screen, SegmentedControl, Skeleton, Text, TextField } from '../../../components';
import { ContentGate } from '../../../content/ContentGate';
import { useSupportHub } from '../../../content/queries';
import { t } from '../../../i18n';
import { useIsOnline } from '../../../lib/network';
import { useSettings } from '../../../settings/useSettings';
import { analytics } from '../../../lib/analytics';

const CHANNELS = [
  ['text', 'ask.channel.text'],
  ['email', 'ask.channel.email'],
  ['app', 'ask.channel.app'],
] as const;
type Channel = (typeof CHANNELS)[number][0];

/**
 * BV-4: a guest's question survives the sign-in detour (which dismisses this screen). Module memory only, never
 * persisted, taken back once the screen reopens.
 */
let draft: { topic: string | null; channel: Channel; message: string } | null = null;

/** `/support/ask` — SUP-04 (empty, filled, error, sending). Sending needs a connection and a signed-in customer. */
export default function AskUs() {
  const router = useRouter();
  const online = useIsOnline();
  const { status, session } = useAuth();
  const hub = useSupportHub();
  const reply = useSettings().data?.data.clinic.supportReplyTime ?? '';
  const [saved] = useState(() => draft);
  useEffect(() => {
    draft = null;
  }, []);
  const [topic, setTopic] = useState<string | null>(saved?.topic ?? null);
  const [channel, setChannel] = useState<Channel>(saved?.channel ?? 'text');
  const [message, setMessage] = useState(saved?.message ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // One key per question: a retry after a lost response returns the same reference instead of a duplicate.
  const [idempotencyKey] = useState(() => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
  const chosenTopic = topic ?? hub.data?.data.askTopics[0] ?? null;

  async function send() {
    if (message.trim().length < 3) {
      setError(t('ask.error'));
      return;
    }
    if (status !== 'signedIn') {
      draft = { topic, channel, message };
      setReturnTo('/support/ask');
      router.push('/auth/phone');
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed('/v1/support/questions', { method: 'POST', body: { topic: chosenTopic, channel, message: message.trim(), idempotencyKey } });
      const { reference } = supportQuestionResponseSchema.parse(res.body);
      analytics.track('support_contact', { topic: (chosenTopic ?? 'other').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32), channel });
      router.replace({ pathname: '/support/ask/sent', params: { reference, channel } });
    } catch {
      setFailed(true); // nothing was sent; the text stays so it can be retried
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('ask.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          topInset={false}
          footer={
            <Button size="lg" fullWidth loading={busy} loadingLabel={t('ask.sending')} disabled={online === false || !chosenTopic} onPress={send}>
              {t('ask.send')}
            </Button>
          }
        >
          <Text variant="titleLg" accessibilityRole="header">
            {t('ask.heading')}
          </Text>
          <Text variant="body" tone="inkMuted">
            {t('ask.body', { time: reply })}
          </Text>
          {online === false ? (
            <Banner tone="offline" title={t('offline.title')}>
              {t('offline.banner')}
            </Banner>
          ) : null}
          <ContentGate query={hub} skeleton={<Skeleton lines={2} media={false} />} offlineBanner={false}>
            {(data) => (
              <View style={styles.group}>
                <Text variant="label">{t('ask.topic')}</Text>
                <View style={styles.chips}>
                  {data.askTopics.map((topicName) => (
                    <Chip key={topicName} selected={chosenTopic === topicName} onPress={() => setTopic(topicName)}>
                      {topicName}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </ContentGate>
          <View style={styles.group}>
            <Text variant="label">{t('ask.replyBy')}</Text>
            <SegmentedControl
              label={t('ask.replyBy')}
              options={CHANNELS.map(([, label]) => t(label))}
              value={t(CHANNELS.find(([c]) => c === channel)![1])}
              onChange={(v) => setChannel(CHANNELS.find(([, label]) => t(label) === v)![0])}
            />
          </View>
          <TextField
            label={t('ask.question')}
            placeholder={t('ask.placeholder')}
            value={message}
            onChangeText={(v) => {
              setMessage(v);
              if (error) setError(undefined);
            }}
            error={error}
            maxLength={1000}
            multiline
            helper={t('privacy.noMedical')}
          />
          {failed ? (
            <Banner tone="danger" title={t('error.title')}>
              {t('error.body')}
            </Banner>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
