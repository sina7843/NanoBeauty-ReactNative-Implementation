import { entitySchema, mediaSchema, type CampaignDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../../auth/AuthProvider';
import { Button, Chip, SegmentedControl, Text, TextField, useToast } from '../../../../components';
import { t } from '../../../../i18n';
import { useSettings } from '../../../../settings/useSettings';
import { problemOf, useStaffQuery } from '../../../../staff/api';
import { WallTimeField } from '../../../../staff/WallTimeField';
import { EntityEditScreen, PreviewCard } from '../../../../staff/EntityEditScreen';
import { useEntityEditor } from '../../../../staff/useEntityEditor';

const TEMPLATES = ['halloween', 'canada_day', 'black_friday', 'holidays', 'own'] as const;
const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);

/** `/staff/campaigns/[id]` — STF-06 editor with lifecycle actions (pause / resume / end / reuse) and STF-07 preview. */
export default function CampaignEdit() {
  const router = useRouter();
  const toast = useToast();
  const { session, me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useEntityEditor<CampaignDraft>('campaigns', id);
  const settings = useSettings();
  const media = useStaffQuery(['media', 'active'], '/v1/staff/media', z.array(mediaSchema));
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const f = editor.form;
  const s = editor.service;
  const ro = editor.readOnly || s?.state === 'archived';
  const canPublish = !!me?.permissions.includes('selling.publish');
  const [copying, setCopying] = useState(false);
  const live = s?.state === 'live' || s?.state === 'unavailable';
  const paused = s?.state === 'unavailable';

  async function duplicate() {
    setCopying(true);
    try {
      const copy = entitySchema.parse((await session.authed(`/v1/staff/campaigns/${id}/duplicate`, { method: 'POST', body: {} })).body);
      toast({ tone: 'success', message: t('cmp.duplicated') });
      router.push(`/staff/campaigns/${copy.id}` as Href);
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    } finally {
      setCopying(false);
    }
  }

  return (
    <EntityEditScreen
      editor={editor}
      title={t('cmp.edit')}
      back={{ to: '/staff/campaigns', label: t('stf.campaigns') }}
      name={f?.title ?? ''}
      publishPermission="selling.publish"
      preview={
        f ? (
          <>
            <PreviewCard overline={f.eyebrow} title={f.title} lines={[f.summary, f.terms.join(' · ')]} />
            <Button variant="tertiary" size="sm" onPress={() => router.push(`/staff/campaigns/${id}/preview` as Href)}>
              {t('cmp.preview')}
            </Button>
          </>
        ) : null
      }
      extraActions={
        <>
          {live && canPublish ? (
            <>
              <Button variant="secondary" loading={editor.busy === 'action'} onPress={() => editor.action(paused ? 'resume' : 'pause')}>
                {paused ? t('cmp.resume') : t('cmp.pause')}
              </Button>
              <Button variant="secondary" onPress={() => editor.action('end')}>
                {t('cmp.end')}
              </Button>
            </>
          ) : null}
          <Button variant="tertiary" loading={copying} onPress={duplicate}>
            {t('cmp.duplicate')}
          </Button>
        </>
      }
    >
      {f ? (
        <>
          <Text variant="label">{t('cmp.pickTemplate')}</Text>
          <View style={styles.chips}>
            {TEMPLATES.map((k) => (
              <Chip key={k} selected={f.template === k} onPress={() => !ro && editor.setForm({ template: k })}>
                {t(`cmp.template.${k}`)}
              </Chip>
            ))}
          </View>
          <TextField label={t('cmp.eyebrow')} value={f.eyebrow} onChangeText={(v) => editor.setForm({ eyebrow: v })} maxLength={40} disabled={ro} />
          <TextField label={t('cmp.title')} value={f.title} onChangeText={(v) => editor.setForm({ title: v })} maxLength={80} disabled={ro} />
          <TextField label={t('cmp.summary')} value={f.summary ?? ''} onChangeText={(v) => editor.setForm({ summary: v || null })} maxLength={200} disabled={ro} optional />
          <TextField label={t('cmp.body')} value={f.body ?? ''} onChangeText={(v) => editor.setForm({ body: v || null })} multiline maxLength={1000} disabled={ro} optional />
          <WallTimeField key={`s${s?.version}`} label={t('ent.startsAt')} iso={f.startsAt} tz={tz} disabled={ro} onChange={(v) => v && editor.setForm({ startsAt: v })} />
          <WallTimeField key={`e${s?.version}`} label={t('ent.endsAt')} iso={f.endsAt} tz={tz} disabled={ro} onChange={(v) => v && editor.setForm({ endsAt: v })} />
          <SegmentedControl
            label={t('cmp.audience')}
            options={[t('cmp.audience.all'), t('cmp.audience.returning')]}
            value={t(`cmp.audience.${f.audience}`)}
            onChange={(v) => !ro && editor.setForm({ audience: v === t('cmp.audience.all') ? 'all' : 'returning' })}
          />
          <TextField label={t('ent.terms')} value={f.terms.join('\n')} onChangeText={(v) => editor.setForm({ terms: lines(v) })} multiline disabled={ro} />
          <TextField label={t('cmp.cta')} value={f.cta.label} onChangeText={(v) => editor.setForm({ cta: { ...f.cta, label: v } })} maxLength={60} disabled={ro} />
          <TextField label={t('cmp.ctaHref')} value={f.cta.href} onChangeText={(v) => editor.setForm({ cta: { ...f.cta, href: v } })} autoCapitalize="none" disabled={ro} />
          <Text variant="label">{t('svc.photo')}</Text>
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
        </>
      ) : null}
    </EntityEditScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
