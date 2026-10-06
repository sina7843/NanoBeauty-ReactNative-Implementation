import type { PolicyDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Card, TextField } from '../../../components';
import { t } from '../../../i18n';
import { EntityEditScreen, PreviewCard } from '../../../staff/EntityEditScreen';
import { useEntityEditor } from '../../../staff/useEntityEditor';

/** `/staff/policies/[id]` — STF-33. Policy wording is high-risk (D35); the change note goes into the version history. */
export default function PolicyEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<PolicyDraft>('policies', id);
  const f = editor.form;
  const ro = editor.readOnly;
  const setSection = (i: number, patch: Partial<PolicyDraft['sections'][number]>) => f && editor.setForm({ sections: f.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <EntityEditScreen
      editor={editor}
      title={t('pol.edit')}
      back={{ to: '/staff/policies', label: t('stf.policies') }}
      name={f?.title ?? ''}
      publishPermission="policies.publish"
      preview={f ? <PreviewCard title={f.title} lines={f.sections.map((s) => s.heading)} /> : null}
    >
      {f ? (
        <>
          <TextField label={t('ent.name')} value={f.title} onChangeText={(v) => editor.setForm({ title: v })} maxLength={80} disabled={ro} />
          {f.sections.map((s, i) => (
            <Card key={i}>
              <TextField label={t('pol.heading')} value={s.heading} onChangeText={(v) => setSection(i, { heading: v })} maxLength={120} disabled={ro} />
              <TextField label={t('pol.body')} value={s.body} onChangeText={(v) => setSection(i, { body: v })} multiline maxLength={5000} disabled={ro} />
              {f.sections.length > 1 ? (
                <View style={styles.right}>
                  <Button variant="tertiary" size="sm" disabled={ro} onPress={() => editor.setForm({ sections: f.sections.filter((_, j) => j !== i) })}>
                    {t('pol.removeSection')}
                  </Button>
                </View>
              ) : null}
            </Card>
          ))}
          <Button variant="secondary" disabled={ro || f.sections.length >= 30} onPress={() => editor.setForm({ sections: [...f.sections, { heading: '', body: '' }] })}>
            {t('pol.addSection')}
          </Button>
          <TextField label={t('pol.changeNote')} value={f.changeNote ?? ''} onChangeText={(v) => editor.setForm({ changeNote: v })} maxLength={200} disabled={ro} />
        </>
      ) : null}
    </EntityEditScreen>
  );
}

const styles = StyleSheet.create({ right: { alignItems: 'flex-end', marginTop: space['2'] } });
