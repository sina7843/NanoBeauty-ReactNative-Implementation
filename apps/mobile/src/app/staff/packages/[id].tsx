import { staffServiceRowSchema, type PackageDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { Chip, Switch, Text, TextField } from '../../../components';
import { money } from '../../../i18n/format';
import { t } from '../../../i18n';
import { useStaffQuery } from '../../../staff/api';
import { EntityEditScreen, PreviewCard } from '../../../staff/EntityEditScreen';
import { ListTextField, splitLines } from '../../../staff/ListTextField';
import { MoneyField } from '../../../staff/MoneyField';
import { useEntityEditor } from '../../../staff/useEntityEditor';

const dollars = (cents: number | null) => (cents === null ? null : cents / 100);
const cents = (v: number | null) => (v === null ? null : Math.round(v * 100));
const int = (v: string) => (v.trim() === '' ? null : Number.parseInt(v, 10) || null);

/** `/staff/packages/[id]` — STF-16. Price and session changes are high-risk (D35); owners keep using what they bought. */
export default function PackageEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<PackageDraft>('packages', id);
  const services = useStaffQuery(['services', 'live', ''], '/v1/staff/services?filter=live', z.array(staffServiceRowSchema));
  const f = editor.form;
  const ro = editor.readOnly || editor.service?.state === 'archived';
  return (
    <EntityEditScreen
      editor={editor}
      title={t('pkg.edit')}
      back={{ to: '/staff/packages', label: t('stf.packages') }}
      name={f?.name ?? ''}
      publishPermission="selling.publish"
      preview={f ? <PreviewCard title={f.name} lines={[`${f.sessions} × · ${money(f.priceCents / 100)}`, f.regularCents ? `${t('pkg.regular')}: ${money(f.regularCents / 100)}` : null, f.terms.join(' · ')]} /> : null}
    >
      {f ? (
        <>
          <TextField label={t('ent.name')} value={f.name} onChangeText={(v) => editor.setForm({ name: v })} maxLength={80} disabled={ro} />
          <Text variant="label">{t('pkg.treatment')}</Text>
          <View style={styles.chips}>
            {(services.data ?? []).map((s) => (
              <Chip key={s.id} selected={f.serviceId === s.id} onPress={() => !ro && editor.setForm({ serviceId: s.id })}>
                {s.name}
              </Chip>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label={t('pkg.sessions')} value={String(f.sessions)} onChangeText={(v) => editor.setForm({ sessions: int(v) ?? 1 })} keyboardType="number-pad" disabled={ro} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('pkg.validity')} value={f.validityMonths?.toString() ?? ''} onChangeText={(v) => editor.setForm({ validityMonths: int(v) })} keyboardType="number-pad" disabled={ro} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <MoneyField label={t('pkg.price')} dollars={dollars(f.priceCents)} onDollars={(v) => editor.setForm({ priceCents: cents(v) ?? 0 })} disabled={ro} />
            </View>
            <View style={styles.flex}>
              <MoneyField label={t('pkg.regular')} dollars={dollars(f.regularCents)} onDollars={(v) => editor.setForm({ regularCents: cents(v) })} disabled={ro} />
            </View>
          </View>
          <ListTextField key={`t${editor.service?.version}`} label={t('ent.terms')} items={f.terms} onItems={(terms) => editor.setForm({ terms })} split={splitLines} join={(i) => i.join('\n')} multiline disabled={ro} />
          <Switch label={t('pkg.sellable')} detail={t('pkg.sellableSub')} value={f.visibility === 'live'} disabled={ro} onValueChange={(v) => editor.setForm({ visibility: v ? 'live' : 'unavailable' })} />
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
