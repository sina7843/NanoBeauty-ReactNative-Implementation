import { entityRowSchema, type PromoDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { Chip, SegmentedControl, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { useSettings } from '../../../settings/useSettings';
import { useStaffQuery } from '../../../staff/api';
import { EntityEditScreen, PreviewCard } from '../../../staff/EntityEditScreen';
import { MoneyField } from '../../../staff/MoneyField';
import { useEntityEditor } from '../../../staff/useEntityEditor';
import { WallTimeField } from '../../../staff/WallTimeField';

const int = (v: string) => (v.trim() === '' ? null : Number.parseInt(v, 10) || null);

/** `/staff/promo-codes/[id]` — STF-20. Discount changes are offer-term changes (D35). */
export default function PromoEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<PromoDraft>('promo-codes', id);
  const campaigns = useStaffQuery(['campaigns', 'list', 'all', ''], '/v1/staff/campaigns?filter=all', z.array(entityRowSchema));
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const f = editor.form;
  const v = editor.service?.version;
  const ro = editor.readOnly || editor.service?.state === 'archived';
  return (
    <EntityEditScreen
      editor={editor}
      title={t('promo.edit')}
      back={{ to: '/staff/promo-codes', label: t('stf.promoCodes') }}
      name={f?.code ?? ''}
      publishPermission="selling.publish"
      preview={f ? <PreviewCard title={f.code} lines={[f.description, f.appliesLabel]} /> : null}
    >
      {f ? (
        <>
          <TextField label={t('promo.code')} helper={t('promo.codeHelp')} value={f.code} disabled />
          <TextField label={t('promo.description')} value={f.description} onChangeText={(x) => editor.setForm({ description: x })} maxLength={120} disabled={ro} />
          <SegmentedControl
            label={t('promo.discountType')}
            options={[t('promo.percent'), t('promo.amount')]}
            value={f.discount.type === 'percent' ? t('promo.percent') : t('promo.amount')}
            onChange={(x) => !ro && editor.setForm({ discount: { ...f.discount, type: x === t('promo.percent') ? 'percent' : 'amount' } })}
          />
          {/* Percent is a whole percent; an amount is typed in dollars with cents (ST-13) and stored in cents. */}
          {f.discount.type === 'amount' ? (
            <MoneyField key={`m${v}`} label={t('promo.value')} dollars={f.discount.value / 100} onDollars={(x) => editor.setForm({ discount: { ...f.discount, value: Math.round((x ?? 0) * 100) } })} disabled={ro} />
          ) : (
            <TextField
              label={t('promo.value')}
              value={String(f.discount.value)}
              onChangeText={(x) => editor.setForm({ discount: { ...f.discount, value: Number.parseInt(x.replace(/[^0-9]/g, ''), 10) || 0 } })}
              keyboardType="number-pad"
              disabled={ro}
            />
          )}
          <TextField label={t('promo.appliesTo')} value={f.appliesTo} onChangeText={(x) => editor.setForm({ appliesTo: x })} autoCapitalize="none" disabled={ro} />
          <TextField label={t('promo.appliesLabel')} value={f.appliesLabel} onChangeText={(x) => editor.setForm({ appliesLabel: x })} disabled={ro} />
          <WallTimeField key={`s${v}`} label={t('ent.startsAt')} iso={f.startsAt} tz={tz} disabled={ro} onChange={(x) => editor.setForm({ startsAt: x })} />
          <WallTimeField key={`e${v}`} label={t('ent.endsAt')} iso={f.endsAt} tz={tz} disabled={ro} onChange={(x) => editor.setForm({ endsAt: x })} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label={t('promo.limit')} value={f.totalLimit?.toString() ?? ''} onChangeText={(x) => editor.setForm({ totalLimit: int(x) })} keyboardType="number-pad" disabled={ro} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('promo.perPerson')} value={String(f.perPerson)} onChangeText={(x) => editor.setForm({ perPerson: int(x) ?? 1 })} keyboardType="number-pad" disabled={ro} />
            </View>
          </View>
          <Text variant="label">{t('promo.campaign')}</Text>
          <View style={styles.chips}>
            <Chip selected={!f.campaignId} onPress={() => !ro && editor.setForm({ campaignId: null })}>
              {t('promo.noCampaign')}
            </Chip>
            {(campaigns.data ?? []).map((c) => (
              <Chip key={c.id} selected={f.campaignId === c.id} onPress={() => !ro && editor.setForm({ campaignId: c.id })}>
                {c.name}
              </Chip>
            ))}
          </View>
        </>
      ) : null}
    </EntityEditScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space['3'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
