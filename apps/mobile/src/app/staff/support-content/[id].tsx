import type { ArticleDraft } from '@nano/contracts';
import { useLocalSearchParams } from 'expo-router';
import { Switch, TextField } from '../../../components';
import { t } from '../../../i18n';
import { EntityEditScreen, PreviewCard } from '../../../staff/EntityEditScreen';
import { useEntityEditor } from '../../../staff/useEntityEditor';

/** `/staff/support-content/[id]` — STF-10 question editor; customers see it on SUP-02 once published. */
export default function ArticleEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<ArticleDraft>('articles', id);
  const f = editor.form;
  const ro = editor.readOnly || editor.service?.state === 'archived';
  return (
    <EntityEditScreen
      editor={editor}
      title={t('art.edit')}
      back={{ to: '/staff/support-content', label: t('stf.supportContent') }}
      name={f?.title ?? ''}
      publishPermission="content.publish"
      preview={f ? <PreviewCard title={f.title} lines={f.body} /> : null}
    >
      {f ? (
        <>
          <TextField label={t('art.question')} value={f.title} onChangeText={(v) => editor.setForm({ title: v })} maxLength={120} disabled={ro} />
          <TextField
            label={t('art.answer')}
            helper={t('art.answerHelp')}
            value={f.body.join('\n\n')}
            onChangeText={(v) => editor.setForm({ body: v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })}
            multiline
            disabled={ro}
          />
          <Switch label={t('art.onHub')} detail={t('art.onHubSub')} value={f.onHub} disabled={ro} onValueChange={(v) => editor.setForm({ onHub: v })} />
        </>
      ) : null}
    </EntityEditScreen>
  );
}
