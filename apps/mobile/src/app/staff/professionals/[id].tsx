import { mediaSchema, type ProfessionalDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { Badge, Chip, Switch, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { useStaffQuery } from '../../../staff/api';
import { EntityEditScreen, PreviewCard } from '../../../staff/EntityEditScreen';
import { useEntityEditor } from '../../../staff/useEntityEditor';

/** `/staff/professionals/[id]` — STF-22. A photo or bio can't go live without the signed consent (C5). */
export default function ProfessionalEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<ProfessionalDraft>('professionals', id);
  const media = useStaffQuery(['media', 'active'], '/v1/staff/media', z.array(mediaSchema));
  const f = editor.form;
  const ro = editor.readOnly || editor.service?.state === 'archived';
  return (
    <EntityEditScreen
      editor={editor}
      title={t('pro.edit')}
      back={{ to: '/staff/professionals', label: t('stf.professionals') }}
      name={f?.name ?? ''}
      publishPermission="professionals.publish"
      preview={f ? <PreviewCard title={f.name} lines={[f.title, f.consent ? f.bio : null]} /> : null}
    >
      {f ? (
        <>
          {!f.consent ? <Badge tone="warning">{t('pro.consentMissing')}</Badge> : null}
          <TextField label={t('ent.name')} value={f.name} onChangeText={(v) => editor.setForm({ name: v })} maxLength={60} disabled={ro} />
          <TextField label={t('pro.title')} value={f.title ?? ''} onChangeText={(v) => editor.setForm({ title: v || null })} maxLength={80} disabled={ro} optional />
          <TextField label={t('pro.bio')} value={f.bio ?? ''} onChangeText={(v) => editor.setForm({ bio: v || null })} multiline maxLength={1000} disabled={ro} optional />
          <Text variant="label">{t('pro.photo')}</Text>
          <View style={styles.chips}>
            <Chip selected={!f.photo} onPress={() => !ro && editor.setForm({ photo: null })}>
              {t('svc.photoNone')}
            </Chip>
            {(media.data ?? [])
              .filter((m) => m.status === 'active')
              .map((m) => (
                <Chip key={m.id} selected={f.photo === `media:${m.id}`} onPress={() => !ro && editor.setForm({ photo: `media:${m.id}` })}>
                  {m.altText ?? m.filename}
                </Chip>
              ))}
          </View>
          <Switch label={t('pro.consent')} detail={t('pro.consentSub')} value={f.consent} disabled={ro} onValueChange={(v) => editor.setForm({ consent: v })} />
          <Switch label={t('ent.visible')} value={f.visible} disabled={ro} onValueChange={(v) => editor.setForm({ visible: v })} />
        </>
      ) : null}
    </EntityEditScreen>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] } });
