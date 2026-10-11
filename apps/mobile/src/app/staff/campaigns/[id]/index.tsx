import { entitySchema, mediaSchema, type CampaignDraft } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../../auth/AuthProvider';
import { Button, Chip, Dialog, SegmentedControl, Text, TextField, useToast } from '../../../../components';
import { t } from '../../../../i18n';
import { useSettings } from '../../../../settings/useSettings';
import { problemText, useStaffQuery } from '../../../../staff/api';
import { joinEligible, ListTextField, splitEligible, splitLines } from '../../../../staff/ListTextField';
import { WallTimeField } from '../../../../staff/WallTimeField';
import { EntityEditScreen, PreviewCard } from '../../../../staff/EntityEditScreen';
import { useEntityEditor } from '../../../../staff/useEntityEditor';

const TEMPLATES = ['halloween', 'canada_day', 'black_friday', 'holidays', 'own'] as const;

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
  const [ending, setEnding] = useState(false);
  const [nowMs] = useState(() => Date.now());
  // ST-16: an ended campaign can't be paused or ended again; the server refuses it too.
  const ended = !!s?.live && Date.parse(String(s.live.endsAt)) <= nowMs;
  const live = (s?.state === 'live' || s?.state === 'unavailable') && !ended;
  const paused = s?.state === 'unavailable';

  async function duplicate() {
    setCopying(true);
    try {
      const copy = entitySchema.parse((await session.authed(`/v1/staff/campaigns/${id}/duplicate`, { method: 'POST', body: {} })).body);
      toast({ tone: 'success', message: t('cmp.duplicated') });
      router.push(`/staff/campaigns/${copy.id}` as Href);
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
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
              <Button variant="secondary" onPress={() => setEnding(true)}>
                {t('cmp.end')}
              </Button>
            </>
          ) : null}
          <Button variant="tertiary" loading={copying} onPress={duplicate}>
            {t('cmp.duplicate')}
          </Button>
          <Dialog
            visible={ending}
            title={t('cmp.endTitle', { name: f?.title ?? '' })}
            confirmLabel={t('cmp.end')}
            cancelLabel={t('common.cancel')}
            destructive
            loading={editor.busy === 'action'}
            onCancel={() => setEnding(false)}
            onConfirm={async () => {
              await editor.action('end');
              setEnding(false);
            }}
          >
            <Text variant="body" tone="inkMuted">
              {t('cmp.endBody')}
            </Text>
          </Dialog>
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
          <ListTextField
            key={`g${s?.version}`}
            label={t('cmp.eligible')}
            helper={t('cmp.eligibleHelp')}
            items={f.eligible}
            onItems={(eligible) => editor.setForm({ eligible })}
            split={splitEligible}
            join={joinEligible}
            tidyOnBlur={false}
            multiline
            disabled={ro}
          />
          <ListTextField key={`t${s?.version}`} label={t('ent.terms')} items={f.terms} onItems={(terms) => editor.setForm({ terms })} split={splitLines} join={(i) => i.join('\n')} multiline disabled={ro} />
          <TextField label={t('cmp.cta')} value={f.cta.label} onChangeText={(v) => editor.setForm({ cta: { ...f.cta, label: v } })} maxLength={60} disabled={ro} />
          <TextField label={t('cmp.ctaHref')} value={f.cta.href} onChangeText={(v) => editor.setForm({ cta: { ...f.cta, href: v } })} autoCapitalize="none" disabled={ro} />
          <Text variant="label">{t('svc.photo')}</Text>
          <View style={styles.chips}>
            <Chip selected={!f.photo} onPress={() => !ro && editor.setForm({ photo: null })}>
              {t('svc.photoNone')}
            </Chip>
            {f.photo && !f.photo.startsWith('media:') ? <Chip selected>{t('cmp.photoBundled')}</Chip> : null}
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
