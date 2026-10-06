import { radius, space } from '@nano/design-tokens';
import { maskPhone } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useInbox, usePreferences } from '../../account/queries';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Banner, Button, ListGroup, ListRow, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate } from '../../i18n/format';
import { useTheme } from '../../theme/ThemeProvider';

/** `/account` — ACC-01. Every account and privacy screen starts here. */
export default function Account() {
  return (
    <Screen topInset={false}>
      <SignInGate>
        <Hub />
      </SignInGate>
    </Screen>
  );
}

function Hub() {
  const { me, signOut, session, refreshMe } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const prefs = usePreferences().data;
  const unread = useInbox().data?.unread ?? 0;
  const [keeping, setKeeping] = useState(false);
  const c = me?.customer;
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(' ');
  const initials = [c?.firstName, c?.lastName].map((n) => n?.[0] ?? '').join('').toUpperCase();
  const year = c?.createdAt ? new Date(c.createdAt).getFullYear() : null;

  async function keep() {
    setKeeping(true);
    try {
      await session.authed('/v1/me/deletion/cancel', { method: 'POST', body: {} });
      await refreshMe();
      queryClient.invalidateQueries({ queryKey: ['deletionPreview'] });
    } catch {
      // stays visible; the person can try again or call the clinic
    } finally {
      setKeeping(false);
    }
  }

  return (
    <>
      <View style={styles.header} accessible accessibilityLabel={name || t('acc.title')}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceTint }]}>
          <Text variant="headline" tone="onTint">
            {initials || '·'}
          </Text>
        </View>
        <View style={styles.flex}>
          {name ? <Text variant="titleLg">{name}</Text> : null}
          {c ? (
            <Text variant="caption" tone="inkMuted">
              {year ? t('acc.since', { phone: maskPhone(c.phone), year }) : maskPhone(c.phone)}
            </Text>
          ) : null}
        </View>
      </View>
      {me?.deletion ? (
        <Banner
          tone="warning"
          title={t('acc.pending.title')}
          action={
            <Button variant="secondary" size="sm" loading={keeping} onPress={keep}>
              {t('acc.pending.keep')}
            </Button>
          }
        >
          {t('acc.pending.body', { date: clinicDate(me.deletion.dueAt, 'America/Vancouver') })}
        </Banner>
      ) : null}
      <ListGroup>
        <ListRow icon="user-circle" title={t('acc.profile')} subtitle={t('acc.profileSub')} onPress={() => router.push('/account/profile')} />
        <ListRow
          icon="bell"
          title={t('acc.notifications')}
          value={prefs ? (prefs.reminders ? t('acc.remindersOn') : t('acc.remindersOff')) : undefined}
          onPress={() => router.push('/account/notifications')}
        />
        <ListRow
          icon="chat-circle-text"
          title={t('acc.messages')}
          value={unread ? t('acc.newCount', { count: unread }) : undefined}
          onPress={() => router.push('/account/inbox')}
        />
        <ListRow icon="lock" title={t('acc.privacy')} onPress={() => router.push('/account/privacy')} />
      </ListGroup>
      <ListGroup>
        <ListRow icon="question" title={t('acc.help')} onPress={() => router.push('/support')} />
        <ListRow icon="receipt" title={t('acc.legal')} onPress={() => router.push('/legal/terms')} />
      </ListGroup>
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
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space['3'] },
  avatar: { width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
