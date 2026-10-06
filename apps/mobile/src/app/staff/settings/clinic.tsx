import type { SettingsBootstrap } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, Skeleton, Switch, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { SettingsBanners } from '../../../staff/SettingsChrome';
import { StaffScreen } from '../../../staff/StaffScreen';
import { useSettingsSave } from '../../../staff/useSettingsSave';
import { useIsOnline } from '../../../lib/network';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Hours = NonNullable<SettingsBootstrap['settings']['clinicHours']>;
type Form = { address: string; phone: string; parking: string; replyTime: string; hours: Hours | null; closures: string };

const toForm = (s: SettingsBootstrap): Form => ({
  address: s.clinic.address,
  phone: s.clinic.phone ?? '',
  parking: s.clinic.parking ?? '',
  replyTime: s.clinic.supportReplyTime ?? '',
  hours: s.settings.clinicHours,
  closures: s.settings.clinicHours?.closures.join(', ') ?? '',
});

/** `/staff/settings/clinic` — STF-31. Changes show in the app right away; a new closed day doesn't cancel bookings. */
export default function ClinicInfo() {
  const s = useSettingsSave('/v1/staff/settings/clinic');
  const online = useIsOnline();
  const [form, setForm] = useState<Form | null>(null);
  const f = form ?? (s.settings ? toForm(s.settings) : null);
  const set = (patch: Partial<Form>) => f && setForm({ ...f, ...patch });
  const ro = online === false;
  const setDay = (day: number, on: boolean) => {
    if (!f?.hours) return;
    const weekly = on ? [...f.hours.weekly.filter((w) => w.day !== day), { day, opens: '10:00', closes: '18:00' }].sort((a, b) => a.day - b.day) : f.hours.weekly.filter((w) => w.day !== day);
    set({ hours: { ...f.hours, weekly } });
  };
  const setTime = (day: number, patch: { opens?: string; closes?: string }) => f?.hours && set({ hours: { ...f.hours, weekly: f.hours.weekly.map((w) => (w.day === day ? { ...w, ...patch } : w)) } });

  return (
    <StaffScreen title={t('stf.clinicInfo')}>
      <SettingsBanners problem={ro ? 'offline' : s.problem} notice={s.notice} reload={() => (setForm(null), s.reload())} />
      {f ? (
        <>
          <TextField label={t('clinic.address')} value={f.address} onChangeText={(v) => set({ address: v })} maxLength={200} disabled={ro} />
          <TextField label={t('clinic.phone')} value={f.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" disabled={ro} optional />
          <TextField label={t('clinic.parking')} value={f.parking} onChangeText={(v) => set({ parking: v })} multiline maxLength={300} disabled={ro} optional />
          <TextField label={t('clinic.replyTime')} value={f.replyTime} onChangeText={(v) => set({ replyTime: v })} maxLength={60} disabled={ro} optional />
          <Text variant="headline">{t('clinic.hours')}</Text>
          {f.hours ? (
            DAYS.map((label, day) => {
              const w = f.hours!.weekly.find((x) => x.day === day);
              return (
                <View key={label} style={styles.day}>
                  <Switch label={label} detail={w ? undefined : t('clinic.closed')} value={!!w} disabled={ro} onValueChange={(on) => setDay(day, on)} />
                  {w ? (
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <TextField label={t('clinic.opens')} value={w.opens} onChangeText={(v) => setTime(day, { opens: v })} disabled={ro} />
                      </View>
                      <View style={styles.flex}>
                        <TextField label={t('clinic.closes')} value={w.closes} onChangeText={(v) => setTime(day, { closes: v })} disabled={ro} />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <>
              <Banner tone="info" title={t('clinic.hoursUnknown')} />
              <Button variant="secondary" disabled={ro} onPress={() => set({ hours: { weekly: [1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: '10:00', closes: '18:00' })), closures: [] } })}>
                {t('clinic.setHours')}
              </Button>
            </>
          )}
          {f.hours ? <TextField label={t('clinic.closures')} value={f.closures} onChangeText={(v) => set({ closures: v })} disabled={ro} autoCapitalize="none" /> : null}
          <Button
            loading={s.busy}
            disabled={ro}
            onPress={async () => {
              const closures = f.closures.split(',').map((c) => c.trim()).filter(Boolean);
              const ok = await s.save({
                address: f.address.trim(),
                phone: f.phone.trim() || null,
                parking: f.parking.trim() || null,
                supportReplyTime: f.replyTime.trim() || null,
                clinicHours: f.hours ? { ...f.hours, closures } : null,
              });
              if (ok) setForm(null);
            }}
          >
            {t('stf.save')}
          </Button>
        </>
      ) : (
        <Skeleton lines={6} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space['3'] },
  day: { gap: space['2'] },
});
