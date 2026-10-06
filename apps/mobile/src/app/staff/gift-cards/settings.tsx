import { useState } from 'react';
import { Banner, Button, Skeleton, TextField } from '../../../components';
import { t } from '../../../i18n';
import { SettingsBanners } from '../../../staff/SettingsChrome';
import { StaffScreen } from '../../../staff/StaffScreen';
import { useSettingsSave } from '../../../staff/useSettingsSave';

const nums = (v: string) => v.split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);

/** `/staff/gift-cards/settings` — STF-17. Amounts, designs and refund window; expiry is locked off (BC law). */
export default function GiftSettings() {
  const s = useSettingsSave('/v1/staff/settings/gifts');
  const gift = s.settings?.settings.gift;
  const [form, setForm] = useState<{ presets: string; min: string; max: string; designs: string; refundDays: string } | null>(null);
  const f =
    form ??
    (gift && s.settings
      ? { presets: gift.presetsCAD.join(', '), min: String(gift.customRangeCAD[0]), max: String(gift.customRangeCAD[1]), designs: gift.designs.join(', '), refundDays: String(s.settings.settings.giftRefundDays) }
      : null);
  const set = (patch: Partial<NonNullable<typeof f>>) => f && setForm({ ...f, ...patch });
  return (
    <StaffScreen title={t('gift.settings')}>
      <SettingsBanners problem={s.problem} notice={s.notice} reload={() => (setForm(null), s.reload())} />
      {f ? (
        <>
          <Banner tone="info" title={t('gift.noExpiry')} />
          <TextField label={t('gift.presets')} value={f.presets} onChangeText={(v) => set({ presets: v })} keyboardType="numbers-and-punctuation" />
          <TextField label={t('gift.min')} value={f.min} onChangeText={(v) => set({ min: v })} keyboardType="decimal-pad" />
          <TextField label={t('gift.max')} value={f.max} onChangeText={(v) => set({ max: v })} keyboardType="decimal-pad" />
          <TextField label={t('gift.designs')} value={f.designs} onChangeText={(v) => set({ designs: v })} autoCapitalize="none" />
          <TextField label={t('gift.refundDays')} value={f.refundDays} onChangeText={(v) => set({ refundDays: v })} keyboardType="number-pad" />
          <Button
            loading={s.busy}
            onPress={async () => {
              const ok = await s.save({
                gift: { presetsCAD: nums(f.presets), customRangeCAD: [Number(f.min), Number(f.max)], expiry: null, designs: f.designs.split(',').map((d) => d.trim()).filter(Boolean) },
                giftRefundDays: Number.parseInt(f.refundDays, 10) || 0,
              });
              if (ok) setForm(null);
            }}
          >
            {t('stf.save')}
          </Button>
        </>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}
