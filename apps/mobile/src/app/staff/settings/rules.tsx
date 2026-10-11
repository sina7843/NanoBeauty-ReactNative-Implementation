import type { Features, Settings } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, Card, SegmentedControl, Skeleton, Switch, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { useIsOnline } from '../../../lib/network';
import { centsOf, typeMoney } from '../../../staff/money';
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
  const c = centsOf(v);
  return c === null ? fallback : c / 100;
};
const hoursOf = (v: string) => v.split(',').map((x) => Number.parseInt(x.trim(), 10)).filter((n) => n > 0 && n <= 168).slice(0, 3);

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
  // Text while typing (ST-1, ST-13): money keeps "25." and "49.9"; the reminder list keeps commas and spaces. Parsed on save.
  const [raw, setRaw] = useState<Record<string, string>>({});
  const set = (patch: Partial<Settings>) => {
    s.pin();
    if (f) setForm({ ...f, settings: { ...f.settings, ...patch } });
  };
  const money = (key: string, label: string, value: number, apply: (n: number) => void) => (
    <TextField
      label={label}
      value={raw[key] ?? String(value)}
      onChangeText={(v) => {
        const text = typeMoney(v);
        setRaw({ ...raw, [key]: text });
        apply(num(text));
      }}
      keyboardType="decimal-pad"
      disabled={ro}
    />
  );
  const outcome = (label: string, key: 'lateCancelOutcome' | 'lateChangeOutcome' | 'noShowOutcome') =>
    f ? (
      <SegmentedControl label={label} options={OUTCOMES.map((o) => t(`rules.outcome.${o}`))} value={t(`rules.outcome.${f.settings[key]}`)} onChange={(v) => !ro && set({ [key]: OUTCOMES.find((o) => t(`rules.outcome.${o}`) === v)! })} />
    ) : null;

  const saveButton = f ? (
      <Button
        loading={s.busy}
        disabled={ro}
        onPress={async () => {
          const { bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays, reminderSender, reminderHours, quietHours } = f.settings;
          const ok = await s.save({
            settings: { bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods: { ...paymentMethods, card: true }, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays, reminderSender, reminderHours, quietHours },
            features: f.features,
          });
          if (ok) {
            setForm(null);
            setRaw({});
          }
        }}
      >
        {t('stf.save')}
      </Button>
  ) : null;
  const aside = f ? (
    <>
      <Card>
        <Text variant="overline" tone="inkMuted">
          {t('rules.summary')}
        </Text>
        <Text variant="body">{f.settings.deposit ? t('rules.sumDeposit', { amount: f.settings.deposit.amountCAD, over: f.settings.deposit.overCAD }) : t('rules.sumNoDeposit')}</Text>
        <Text variant="body">{t('rules.sumFree', { hours: f.settings.freeChangeHours })}</Text>
        <Text variant="body">{t('rules.sumHold', { minutes: f.settings.slotHoldMinutes })}</Text>
        <Text variant="caption" tone="inkMuted">
          {t('rules.sumNote')}
        </Text>
      </Card>
      {saveButton}
    </>
  ) : null;

  return (
    <StaffScreen title={t('stf.rules')} aside={aside}>
      <SettingsBanners problem={ro ? 'offline' : s.problem} message={s.message} notice={s.notice} reload={() => (setForm(null), setRaw({}), s.reload())} />
      {f ? (
        <>
          <Text variant="headline">{t('rules.booking')}</Text>
          <TextField label={t('rules.mode')} value={t('rules.handoff')} disabled helper={t('rules.inappLocked')} />
          <Switch label={t('rules.depositOn')} value={!!f.settings.deposit} disabled={ro} onValueChange={(on) => set({ deposit: on ? { amountCAD: 50, overCAD: 150 } : null })} />
          {f.settings.deposit ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                {money('depositAmount', t('rules.depositAmount'), f.settings.deposit.amountCAD, (n) => set({ deposit: { ...f.settings.deposit!, amountCAD: n } }))}
              </View>
              <View style={styles.flex}>
                {money('depositOver', t('rules.depositOver'), f.settings.deposit.overCAD, (n) => set({ deposit: { ...f.settings.deposit!, overCAD: n } }))}
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
          {money('consultation', t('rules.consultation'), f.settings.consultation.priceCAD, (n) => set({ consultation: { ...f.settings.consultation, priceCAD: n } }))}
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
              value={raw.reminderHours ?? f.settings.reminderHours.join(', ')}
              onChangeText={(v) => {
                setRaw({ ...raw, reminderHours: v });
                const hours = hoursOf(v);
                if (hours.length) set({ reminderHours: hours });
              }}
              onBlur={() => setRaw(({ reminderHours: _drop, ...rest }) => rest)}
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
          {METHODS.map(([key, label]) =>
            key === 'card' ? (
              // D-QA-04: card payments are always on; the row is locked.
              <Switch key={key} label={label} value locked onValueChange={() => undefined} />
            ) : (
              <Switch key={key} label={label} value={f.settings.paymentMethods[key]} disabled={ro} onValueChange={(v) => set({ paymentMethods: { ...f.settings.paymentMethods, [key]: v } })} />
            ),
          )}
          <Switch label={t('rules.financing')} value={f.settings.financingLine.on} disabled={ro} onValueChange={(v) => set({ financingLine: { ...f.settings.financingLine, on: v } })} />
          {f.settings.financingLine.on
            ? money('financingMin', t('rules.financingMin'), f.settings.financingLine.minCAD, (n) => set({ financingLine: { ...f.settings.financingLine, minCAD: n } }))
            : null}

          <Text variant="headline">{t('rules.approvals')}</Text>
          <Switch label={t('rules.secondApprover')} detail={t('rules.secondApproverSub')} value={f.settings.secondApprover.on} disabled={ro} onValueChange={(v) => set({ secondApprover: { ...f.settings.secondApprover, on: v } })} />

          <Text variant="headline">{t('rules.features')}</Text>
          <Switch label={t('rules.membership')} detail={t('rules.membershipSub')} value={f.features.legacyMembership} disabled={ro} onValueChange={(v) => (s.pin(), setForm({ ...f, features: { ...f.features, legacyMembership: v } }))} />
          <Switch label={t('rules.rating')} value={f.settings.ratingLine.on} disabled={ro} onValueChange={(v) => set({ ratingLine: { ...f.settings.ratingLine, on: v } })} />
          <TextField label={t('rules.graceDays')} value={String(f.settings.deletionGraceDays)} onChangeText={(v) => set({ deletionGraceDays: Math.trunc(num(v)) })} keyboardType="number-pad" disabled={ro} />
          {f.settings.sample ? <Banner tone="info" title={t('home.sampleRules')} /> : null}

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
