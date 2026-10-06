import { categoryRowSchema, mediaSchema, staffSummarySchema, type Price } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { Badge, Banner, Card, Chip, ListGroup, ListRow, SegmentedControl, Skeleton, Switch, Text, TextField } from '../../../../components';
import { priceLabel } from '../../../../booking/summary';
import { t } from '../../../../i18n';
import { useStaffQuery } from '../../../../staff/api';
import { EditorActions, EditorBanners } from '../../../../staff/EditorChrome';
import { StaffScreen } from '../../../../staff/StaffScreen';
import { useServiceEditor } from '../../../../staff/useServiceEditor';

const KINDS: Price['kind'][] = ['fixed', 'from', 'range', 'perUnit', 'consultation'];
const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/[$,\s]/g, '')));

/** `/staff/services/[id]` — STF-03 (draft, conflict, offline, savefailed) with the tablet two-column layout (TAB-01). */
export default function ServiceEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useServiceEditor(id);
  const categories = useStaffQuery(['categories'], '/v1/staff/categories', z.array(categoryRowSchema));
  const media = useStaffQuery(['media', 'active'], '/v1/staff/media', z.array(mediaSchema));
  const summary = useStaffQuery(['summary'], '/v1/staff/summary', staffSummarySchema);
  const f = editor.form;
  const s = editor.service;
  const ro = editor.readOnly || s?.state === 'archived';

  if (!f || !s) {
    return (
      <StaffScreen title={t('svc.edit')} back={{ to: '/staff/services', label: t('stf.services') }}>
        {editor.query.isError ? <Banner tone="danger" title={t('error.title')}>{t('error.body')}</Banner> : <Skeleton lines={6} media={false} />}
      </StaffScreen>
    );
  }
  const price = f.price;
  const setPrice = (patch: Partial<Price>) => editor.setForm({ price: { ...price, ...patch } });

  const preview = (
    <Card>
      <Text variant="overline" tone="inkMuted">
        {t('svc.preview')}
      </Text>
      <Text variant="titleLg">{f.name}</Text>
      <Text variant="body">{[priceLabel(f.price, null), f.durationLabel].filter(Boolean).join(' · ')}</Text>
      {f.description ? (
        <Text variant="caption" tone="inkMuted" numberOfLines={4}>
          {f.description}
        </Text>
      ) : null}
    </Card>
  );
  const actions = (
    <View style={styles.actions}>
      <EditorActions editor={editor} name={f.name} secondApprover={!!summary.data?.secondApprover} />
    </View>
  );

  return (
    <StaffScreen
      title={t('svc.edit')}
      back={{ to: '/staff/services', label: t('stf.services') }}
      aside={
        <>
          {preview}
          {actions}
        </>
      }
    >
      <View style={styles.head}>
        <Badge tone={s.state === 'live' ? 'success' : s.state === 'review' ? 'warning' : 'info'}>{t(`stf.state.${s.state}`)}</Badge>
        {s.updatedAt ? (
          <Text variant="caption" tone="inkMuted">
            {t('svc.savedAgo', { time: new Date(s.updatedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) })}
          </Text>
        ) : null}
      </View>
      <EditorBanners editor={editor} />

      <Text variant="headline">{t('svc.details')}</Text>
      <TextField label={t('svc.name')} value={f.name} onChangeText={(v) => editor.setForm({ name: v })} maxLength={80} disabled={ro} />
      <Text variant="label">{t('svc.category')}</Text>
      <View style={styles.chips}>
        {(categories.data ?? [])
          .filter((c) => !c.archived)
          .map((c) => (
            <Chip key={c.id} selected={f.categoryId === c.id} onPress={() => !ro && editor.setForm({ categoryId: c.id })}>
              {c.name}
            </Chip>
          ))}
      </View>
      <TextField
        label={t('svc.search')}
        helper={t('svc.searchHelp')}
        value={f.aliases.join(', ')}
        onChangeText={(v) => editor.setForm({ aliases: v.split(',').map((a) => a.trim()).filter(Boolean) })}
        disabled={ro}
        autoCapitalize="none"
      />
      <TextField label={t('svc.description')} value={f.description ?? ''} onChangeText={(v) => editor.setForm({ description: v || null })} multiline maxLength={2000} disabled={ro} />

      <Text variant="headline">{t('svc.priceDuration')}</Text>
      <SegmentedControl
        label={t('svc.priceType')}
        options={KINDS.map((k) => t(`svc.kind.${k}`))}
        value={t(`svc.kind.${price.kind}`)}
        onChange={(v) => !ro && setPrice({ kind: KINDS.find((k) => t(`svc.kind.${k}`) === v)! })}
      />
      {price.kind === 'range' ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label={t('svc.min')} value={price.min?.toString() ?? ''} onChangeText={(v) => setPrice({ min: num(v) })} keyboardType="decimal-pad" disabled={ro} />
          </View>
          <View style={styles.flex}>
            <TextField label={t('svc.max')} value={price.max?.toString() ?? ''} onChangeText={(v) => setPrice({ max: num(v) })} keyboardType="decimal-pad" disabled={ro} />
          </View>
        </View>
      ) : price.kind !== 'consultation' ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label={t('svc.price')} value={price.amount?.toString() ?? ''} onChangeText={(v) => setPrice({ amount: num(v) })} keyboardType="decimal-pad" disabled={ro} />
          </View>
          {price.kind === 'perUnit' ? (
            <View style={styles.flex}>
              <TextField label={t('svc.unit')} value={price.unit ?? ''} onChangeText={(v) => setPrice({ unit: v })} disabled={ro} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('svc.duration')}
            value={f.durationMin?.toString() ?? ''}
            onChangeText={(v) => editor.setForm({ durationMin: v.trim() ? Number.parseInt(v, 10) || null : null })}
            keyboardType="number-pad"
            disabled={ro}
          />
        </View>
        <View style={styles.flex}>
          <TextField label={t('svc.durationLabel')} value={f.durationLabel ?? ''} onChangeText={(v) => editor.setForm({ durationLabel: v || null })} disabled={ro} />
        </View>
      </View>

      <Text variant="headline">{t('svc.photo')}</Text>
      <View style={styles.chips}>
        <Chip selected={!f.photo} onPress={() => !ro && editor.setForm({ photo: null })}>
          {t('svc.photoNone')}
        </Chip>
        {f.photo && !f.photo.startsWith('media:') ? <Chip selected>{f.photo}</Chip> : null}
        {(media.data ?? [])
          .filter((m) => m.status === 'active')
          .map((m) => (
            <Chip key={m.id} selected={f.photo === `media:${m.id}`} onPress={() => !ro && editor.setForm({ photo: `media:${m.id}` })}>
              {m.altText ?? m.filename}
            </Chip>
          ))}
      </View>

      <ListGroup>
        <ListRow title={t('svc.faq')} subtitle={t('svc.faqCount', { count: f.faq.length })} onPress={() => router.push(`/staff/services/${s.id}/faq` as Href)} />
      </ListGroup>
      <Text variant="headline">{t('svc.visibility')}</Text>
      <Switch label={t('svc.bookable')} detail={t('svc.bookableSub')} value={f.visibility === 'live'} disabled={ro} onValueChange={(v) => editor.setForm({ visibility: v ? 'live' : 'unavailable' })} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  row: { flexDirection: 'row', gap: space['3'] },
  actions: { gap: space['2'] },
});
