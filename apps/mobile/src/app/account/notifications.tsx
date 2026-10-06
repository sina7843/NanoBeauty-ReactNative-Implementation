import { preferencesSchema, type Preferences } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { usePreferences } from '../../account/queries';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Banner, Button, Screen, Skeleton, Switch, Text } from '../../components';
import { t } from '../../i18n';
import { getNotificationPermission, type PermissionState } from '../../platform/notifications';

/**
 * `/account/notifications` — ACC-03 (NOTIF 04). Booking messages are transactional and locked on; offers are the
 * separate marketing consent. The OS permission is only explained here, with a way to Settings (PRIV 06).
 */
export default function Notifications() {
  return (
    <>
      <Stack.Screen options={{ title: t('ntf.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <Settings />
        </SignInGate>
      </Screen>
    </>
  );
}

function Settings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const prefs = usePreferences();
  const [os, setOs] = useState<PermissionState | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkOs = useCallback(() => {
    getNotificationPermission().then(setOs);
  }, []);
  useEffect(() => {
    checkOs();
    // Coming back from Settings re-reads the permission.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && checkOs());
    return () => sub.remove();
  }, [checkOs]);

  async function change(patch: Partial<Preferences>) {
    const current = prefs.data!;
    const next = { reminders: current.reminders, aftercare: current.aftercare, marketing: current.marketing, ...patch };
    setSaving(true);
    setFailed(false);
    try {
      // The switch shows the saved value only once the server has it.
      const res = await session.authed('/v1/me/preferences', { method: 'PUT', body: next });
      queryClient.setQueryData(['preferences'], preferencesSchema.parse(res.body));
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (!prefs.data) {
    return prefs.isError ? (
      <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => prefs.refetch()}>{t('error.retry')}</Button>}>
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={4} media={false} />
    );
  }
  const p = prefs.data;
  return (
    <>
      {os === 'denied' ? (
        <Banner
          tone="warning"
          title={t('ntf.offTitle')}
          action={
            <Button variant="secondary" size="sm" onPress={() => Linking.openSettings().catch(() => undefined)}>
              {t('ntf.openSettings')}
            </Button>
          }
        >
          {t('ntf.offBody')}
        </Banner>
      ) : null}
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('ntf.saveError')}
        </Banner>
      ) : null}
      <View style={styles.group}>
        <Switch label={t('ntf.booking')} detail={t('ntf.bookingSub')} value locked />
        <Switch label={t('ntf.reminders')} detail={t('ntf.remindersSub')} value={p.reminders} disabled={saving} onValueChange={(v) => change({ reminders: v })} />
        <Switch label={t('ntf.aftercare')} detail={t('ntf.aftercareSub')} value={p.aftercare} disabled={saving} onValueChange={(v) => change({ aftercare: v })} />
        <Switch label={t('ntf.offers')} detail={t('ntf.offersSub')} value={p.marketing} disabled={saving} onValueChange={(v) => change({ marketing: v })} />
      </View>
      <Text variant="caption" tone="inkMuted">
        {t('ntf.quiet')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: space['2'] },
});
