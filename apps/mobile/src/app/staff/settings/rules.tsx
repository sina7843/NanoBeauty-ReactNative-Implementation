import type { Features, Settings } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, SegmentedControl, Skeleton, Switch, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { useIsOnline } from '../../../lib/network';
import { SettingsBanners } from '../../../staff/SettingsChrome';
import { StaffScreen } from '../../../staff/StaffScreen';
import { useSettingsSave } from '../../../staff/useSettingsSave';

const OUTCOMES = ['keepDeposit', 'credit', 'none'] as const;
const SENDERS = ['fresha', 'app'] as const;
const METHODS = [
  ['card', 'Card'],
  ['applePay', 'Apple Pay'],
  ['googlePay', 'Google Pay'],
  ['klarna', 'Klarna'],
  ['affirm', 'Affirm'],
] as const;
const num = (v: string, fallback = 0) => {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * `/staff/settings/rules` — STF-32. Booking rules (A1–A8), payment switches, second approver and feature flags. Saved
 * rules apply to new bookings and purchases without an app update; in-app booking stays locked (D33).
 */
export default function Rules() {
  const s = useSettingsSave('/v1/staff/settings/rules');
  const online = useIsOnline();
  const [form, setForm] = useState<{ settings: Settings; features: Features } | null>(null);
  const f = form ?? (s.settings ? { settings: s.settings.settings, features: s.settings.features } : null);
  const ro = online === false;
  const set = (patch: Partial<Settings>) => f && setForm({ ...f, settings: { ...f.settings, ...patch } });
  const outcome = (label: string, key: 'lateCancelOutcome' | 'lateChangeOutcome' | 'noShowOutcome') =>
    f ? (
      <SegmentedControl label={label} options={OUTCOMES.map((o) => t(`rules.outcome.${o}`))} value={t(`rules.outcome.${f.settings[key]}`)} onChange={(v) => !ro && set({ [key]: OUTCOMES.find((o) => t(`rules.outcome.${o}`) === v)! })} />
    ) : null;

  return (
    <StaffScreen title={t('stf.rules')}>
      <SettingsBanners problem={ro ? 'offline' : s.problem} notice={s.notice} reload={() => (setForm(null), s.reload())} />
      {f ? (
        <>
          <Text variant="headline">{t('rules.booking')}</Text>
          <TextField label={t('rules.mode')} value={t('rules.handoff')} disabled helper={t('rules.inappLocked')} />
          <Switch label={t('rules.depositOn')} value={!!f.settings.deposit} disabled={ro} onValueChange={(on) => set({ deposit: on ? { amountCAD: 50, overCAD: 150 } : null })} />
          {f.settings.deposit ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label={t('rules.depositAmount')} value={String(f.settings.deposit.amountCAD)} onChangeText={(v) => set({ deposit: { ...f.settings.deposit!, amountCAD: num(v) } })} keyboardType="decimal-pad" disabled={ro} />
              </View>
              <View style={styles.flex}>
                <TextField label={t('rules.depositOver')} value={String(f.settings.deposit.overCAD)} onChangeText={(v) => set({ deposit: { ...f.settings.deposit!, overCAD: num(v) } })} keyboardType="decimal-pad" disabled={ro} />
              </View>
            </View>
          ) : null}
          <TextField label={t('rules.freeHours')} value={String(f.settings.freeChangeHours)} onChangeText={(v) => set({ freeChangeHours: Math.trunc(num(v)) })} keyboardType="number-pad" disabled={ro} />
          {outcome(t('rules.lateCancel'), 'lateCancelOutcome')}
          {outcome(t('rules.lateChange'), 'lateChangeOutcome')}
          {outcome(t('rules.noShow'), 'noShowOutcome')}
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label={t('rules.holdMinutes')} value={String(f.settings.slotHoldMinutes)} onChangeText={(v) => set({ slotHoldMinutes: Math.max(1, Math.trunc(num(v, 1))) })} keyboardType="number-pad" disabled={ro} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('rules.holdWarning')} value={String(f.settings.slotHoldWarningMinutes)} onChangeText={(v) => set({ slotHoldWarningMinutes: Math.trunc(num(v)) })} keyboardType="number-pad" disabled={ro} />
            </View>
          </View>
          <TextField label={t('rules.consultation')} value={String(f.settings.consultation.priceCAD)} onChangeText={(v) => set({ consultation: { ...f.settings.consultation, priceCAD: num(v) } })} keyboardType="decimal-pad" disabled={ro} />
          <Switch label={t('rules.consultationCredited')} value={f.settings.consultation.credited} disabled={ro} onValueChange={(v) => set({ consultation: { ...f.settings.consultation, credited: v } })} />

          <Text variant="headline">{t('rules.reminders')}</Text>
          <SegmentedControl
            label={t('rules.reminderSender')}
            options={SENDERS.map((x) => t(`rules.sender.${x}`))}
            value={t(`rules.sender.${f.settings.reminderSender}`)}
            onChange={(v) => !ro && set({ reminderSender: SENDERS.find((x) => t(`rules.sender.${x}`) === v)! })}
          />
          <Text variant="caption" tone="inkMuted">
            {t('rules.reminderOne')}
          </Text>
          {f.settings.reminderSender === 'app' ? (
            <TextField
              label={t('rules.reminderHours')}
              value={f.settings.reminderHours.join(', ')}
              onChangeText={(v) => {
                const hours = v.split(',').map((x) => Number.parseInt(x.trim(), 10)).filter((n) => n > 0 && n <= 168).slice(0, 3);
                if (hours.length) set({ reminderHours: hours });
              }}
              keyboardType="numbers-and-punctuation"
              disabled={ro}
            />
          ) : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label={t('rules.quietFrom')} value={f.settings.quietHours.start} onChangeText={(v) => set({ quietHours: { ...f.settings.quietHours, start: v } })} disabled={ro} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('rules.quietTo')} value={f.settings.quietHours.end} onChangeText={(v) => set({ quietHours: { ...f.settings.quietHours, end: v } })} disabled={ro} />
            </View>
          </View>

          <Text variant="headline">{t('rules.payments')}</Text>
          {METHODS.map(([key, label]) => (
            <Switch key={key} label={label} value={f.settings.paymentMethods[key]} disabled={ro} onValueChange={(v) => set({ paymentMethods: { ...f.settings.paymentMethods, [key]: v } })} />
          ))}
          <Switch label={t('rules.financing')} value={f.settings.financingLine.on} disabled={ro} onValueChange={(v) => set({ financingLine: { ...f.settings.financingLine, on: v } })} />
          {f.settings.financingLine.on ? (
            <TextField label={t('rules.financingMin')} value={String(f.settings.financingLine.minCAD)} onChangeText={(v) => set({ financingLine: { ...f.settings.financingLine, minCAD: num(v) } })} keyboardType="decimal-pad" disabled={ro} />
          ) : null}

          <Text variant="headline">{t('rules.approvals')}</Text>
          <Switch label={t('rules.secondApprover')} detail={t('rules.secondApproverSub')} value={f.settings.secondApprover.on} disabled={ro} onValueChange={(v) => set({ secondApprover: { ...f.settings.secondApprover, on: v } })} />

          <Text variant="headline">{t('rules.features')}</Text>
          <Switch label={t('rules.membership')} detail={t('rules.membershipSub')} value={f.features.legacyMembership} disabled={ro} onValueChange={(v) => setForm({ ...f, features: { ...f.features, legacyMembership: v } })} />
          <Switch label={t('rules.rating')} value={f.settings.ratingLine.on} disabled={ro} onValueChange={(v) => set({ ratingLine: { ...f.settings.ratingLine, on: v } })} />
          <TextField label={t('rules.graceDays')} value={String(f.settings.deletionGraceDays)} onChangeText={(v) => set({ deletionGraceDays: Math.trunc(num(v)) })} keyboardType="number-pad" disabled={ro} />
          {f.settings.sample ? <Banner tone="info" title={t('home.sampleRules')} /> : null}

          <Button
            loading={s.busy}
            disabled={ro}
            onPress={async () => {
              const { bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays, reminderSender, reminderHours, quietHours } = f.settings;
              const ok = await s.save({
                settings: { bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays, reminderSender, reminderHours, quietHours },
                features: f.features,
              });
              if (ok) setForm(null);
            }}
          >
            {t('stf.save')}
          </Button>
        </>
      ) : (
        <Skeleton lines={8} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space['3'] },
});
