import { space } from '@nano/design-tokens';
import * as Application from 'expo-application';
import type { ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '../components';
import { t } from '../i18n';
import { clinicTime, timeZoneLabel } from '../i18n/format';
import { useSettings } from '../settings/useSettings';
import { useTheme } from '../theme/ThemeProvider';

// ENT-02 / ENT-03 blocking screens. Rendered by the root layout in place of the whole navigator, so deep
// links, notification opens and warm resumes can't bypass them.

/** Store/dialer links can fail (no handler); never surface an unhandled rejection. */
const openSafely = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

function useClinicCall() {
  const phone = useSettings().data?.data.clinic.phone ?? null;
  // ponytail: no number yet (open-items C7) → the call action is hidden rather than dialling nothing (docs/deviations.md).
  return phone ? () => openSafely(`tel:${phone.replace(/[^\d+]/g, '')}`) : null;
}

export function EntryLayout({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'end' }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View style={[styles.body, align === 'end' ? styles.end : styles.center]}>{children}</View>
    </SafeAreaView>
  );
}

/** ENT-02 */
export function UpdateRequired() {
  const store = useSettings().data?.data.app.storeUrl;
  const call = useClinicCall();
  const url =
    Platform.OS === 'ios'
      ? (store?.ios ?? null)
      : (store?.android ?? (Application.applicationId ? `https://play.google.com/store/apps/details?id=${Application.applicationId}` : null));
  return (
    <EntryLayout>
      <EmptyState icon="arrow-clockwise" title={t('ent.update.title')}>
        {t('ent.update.body')}
      </EmptyState>
      <Button size="lg" fullWidth disabled={!url} onPress={() => url && openSafely(url)}>
        {t('ent.update.action')}
      </Button>
      {call ? (
        <Button variant="tertiary" icon="phone" fullWidth onPress={call}>
          {t('ent.callClinic')}
        </Button>
      ) : null}
    </EntryLayout>
  );
}

/** ENT-03 — the end time is the server's maintenance window in clinic-local time. */
export function Maintenance() {
  const data = useSettings().data?.data;
  const call = useClinicCall();
  const until = data?.app.maintenance?.until;
  const zone = data?.clinic.timezone ?? 'America/Vancouver';
  return (
    <EntryLayout>
      <EmptyState icon="hourglass-medium" title={t('ent.maintenance.title')}>
        {until ? t('ent.maintenance.body', { time: clinicTime(until, zone), zone: timeZoneLabel(zone) }) : undefined}
      </EmptyState>
      {call ? (
        <Button variant="secondary" icon="phone" fullWidth onPress={call}>
          {t('ent.callClinic')}
        </Button>
      ) : null}
    </EntryLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, gap: space['2'], paddingHorizontal: space['5'] },
  center: { justifyContent: 'center' },
  end: { justifyContent: 'flex-end', paddingBottom: space['12'] },
});
