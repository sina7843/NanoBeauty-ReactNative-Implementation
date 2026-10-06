import { staffSummarySchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, Card, IconButton, Skeleton, Text, TextField } from '../../../../components';
import { t } from '../../../../i18n';
import { useStaffQuery } from '../../../../staff/api';
import { EditorActions, EditorBanners } from '../../../../staff/EditorChrome';
import { StaffScreen } from '../../../../staff/StaffScreen';
import { useServiceEditor } from '../../../../staff/useServiceEditor';

/** `/staff/services/[id]/faq` — STF-40 (ready, live). Edits make a new draft; clients keep the live answers. */
export default function FaqEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useServiceEditor(id);
  const summary = useStaffQuery(['summary'], '/v1/staff/summary', staffSummarySchema);
  const f = editor.form;
  const s = editor.service;
  const ro = editor.readOnly || s?.state === 'archived';
  const back = { to: `/staff/services/${id}` as Href, label: f?.name ?? t('svc.edit') };
  if (!f || !s) {
    return (
      <StaffScreen title={t('svc.faq')} back={back}>
        <Skeleton lines={5} media={false} />
      </StaffScreen>
    );
  }
  const setItem = (i: number, patch: Partial<{ q: string; a: string }>) => editor.setForm({ faq: f.faq.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <StaffScreen
      title={t('svc.faq')}
      back={back}
      aside={
        <View style={styles.actions}>
          <EditorActions editor={editor} name={f.name} secondApprover={!!summary.data?.secondApprover} />
        </View>
      }
    >
      <Text variant="body" tone="inkMuted">
        {t('faq.shownOn', { name: f.name })}
      </Text>
      {s.live && s.live.faq.length ? <Banner tone="info" title={t('faq.liveNote')} /> : null}
      <EditorBanners editor={editor} />
      {f.faq.map((item, i) => (
        <Card key={i}>
          <View style={styles.head}>
            <Text variant="label" style={styles.flex}>{`${t('faq.question')} ${i + 1}`}</Text>
            {!ro ? <IconButton icon="trash" label={t('faq.remove', { n: i + 1 })} onPress={() => editor.setForm({ faq: f.faq.filter((_, j) => j !== i) })} /> : null}
          </View>
          <TextField label={t('faq.question')} value={item.q} onChangeText={(v) => setItem(i, { q: v })} maxLength={200} disabled={ro} />
          <TextField label={t('faq.answer')} value={item.a} onChangeText={(v) => setItem(i, { a: v })} multiline maxLength={2000} disabled={ro} />
        </Card>
      ))}
      <Button variant="secondary" icon="pencil-simple" disabled={ro || f.faq.length >= 30} onPress={() => editor.setForm({ faq: [...f.faq, { q: '', a: '' }] })}>
        {t('faq.add')}
      </Button>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  actions: { gap: space['2'] },
});
