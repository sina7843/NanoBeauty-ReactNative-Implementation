import { mediaSchema, type Media } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider';
import { getEnv } from '../../config/env';
import { Badge, Banner, Button, Card, ConfirmDialog, EmptyState, SearchField, Skeleton, Switch, Text, TextField, useToast } from '../../components';
import { t } from '../../i18n';
import { problemOf, useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * `/staff/media` — STF-36 (library, empty, uploading, rights). A photo is usable only with alt text and the
 * clinic's rights confirmed (R07). The photo library is opened only when Upload is tapped (PRIV 06).
 */
export default function MediaLibrary() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes('content.publish');
  const [q, setQ] = useState('');
  const [archived, setArchived] = useState(false);
  const list = useStaffQuery(['media', archived, q], `/v1/staff/media?archived=${archived}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, z.array(mediaSchema));
  const [uploading, setUploading] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff', 'media'] });

  async function upload() {
    setFailed(false);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85, allowsMultipleSelection: false });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset?.base64) return;
    const name = asset.fileName ?? 'photo.jpg';
    const contentType = asset.mimeType === 'image/png' ? 'image/png' : asset.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';
    setUploading(name);
    try {
      await session.authed('/v1/staff/media', { method: 'POST', body: { filename: name, contentType, data: asset.base64, width: asset.width || undefined, height: asset.height || undefined } });
      await refresh();
    } catch (e) {
      problemOf(e);
      setFailed(true);
    } finally {
      setUploading(null);
    }
  }

  return (
    <StaffScreen title={t('media.title')}>
      <Text variant="body" tone="inkMuted">
        {t('media.intro')}
      </Text>
      <SearchField value={q} onChangeText={setQ} placeholder={t('media.search')} />
      <Switch label={t('media.archivedList')} value={archived} onValueChange={setArchived} />
      <Button icon="arrow-square-out" loading={!!uploading} loadingLabel={uploading ? t('media.uploading', { name: uploading }) : undefined} onPress={upload}>
        {t('media.upload')}
      </Button>
      {failed ? <Banner tone="danger" title={t('error.title')}>{t('error.body')}</Banner> : null}
      {list.data ? (
        list.data.length ? (
          list.data.map((m) => <MediaCard key={m.id} media={m} canPublish={canPublish} onChanged={refresh} onProblem={(msg) => toast({ tone: 'warning', message: msg })} />)
        ) : (
          <EmptyState icon="eye" title={t('media.empty')} />
        )
      ) : (
        <Skeleton lines={3} />
      )}
    </StaffScreen>
  );
}

function MediaCard({ media: m, canPublish, onChanged, onProblem }: { media: Media; canPublish: boolean; onChanged: () => void; onProblem: (msg: string) => void }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [alt, setAlt] = useState(m.altText ?? '');
  const [rights, setRights] = useState(m.rightsConfirmed);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'restore' | 'delete' | null>(null);
  const dirty = alt !== (m.altText ?? '') || rights !== m.rightsConfirmed;
  const api = getEnv().apiUrl;

  async function call(path: string, method: 'POST' | 'PUT', body: object) {
    setBusy(true);
    try {
      await session.authed(path, { method, body });
      onChanged();
    } catch (e) {
      const p = problemOf(e);
      onProblem(p.kind === 'conflict' ? t('stf.conflict') : t('error.body'));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        {m.status === 'active' && api ? (
          <Image source={{ uri: `${api}/v1/media/${m.id}` }} accessibilityLabel={m.altText ?? ''} style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]} />
        )}
        <View style={styles.flex}>
          <Text variant="body" strong numberOfLines={1}>
            {m.filename}
          </Text>
          <View style={styles.badges}>
            <Badge tone={m.status === 'active' ? 'success' : m.status === 'archived' ? 'neutral' : 'warning'}>{t(`stf.state.${m.status === 'active' ? 'live' : m.status}`)}</Badge>
            {m.inUse ? <Badge tone="info">{t('media.inUse', { count: m.inUse })}</Badge> : null}
          </View>
        </View>
      </View>
      {m.width && m.width < 1050 ? (
        <Text variant="caption" tone="inkMuted">
          {t('media.small', { width: m.width })}
        </Text>
      ) : null}
      {!m.rightsConfirmed && m.status !== 'archived' ? (
        <Banner tone="warning" title={t('media.rightsTitle')}>
          {t('media.rightsBody', { name: m.filename })}
        </Banner>
      ) : null}
      {m.status !== 'archived' ? (
        <>
          <TextField label={t('media.alt')} helper={t('media.altHelp')} value={alt} onChangeText={setAlt} maxLength={250} />
          <Switch label={t('media.rights')} value={rights} onValueChange={setRights} />
          <Button size="sm" loading={busy} disabled={!dirty} onPress={() => call(`/v1/staff/media/${m.id}`, 'PUT', { version: m.version, altText: alt.trim() || null, rightsConfirmed: rights })}>
            {t('media.save')}
          </Button>
        </>
      ) : null}
      <View style={styles.badges}>
        {m.status === 'archived' && canPublish ? (
          <Button variant="tertiary" size="sm" onPress={() => setConfirm('restore')}>
            {t('stf.restore')}
          </Button>
        ) : m.status === 'draft' && !m.inUse ? (
          <Button variant="tertiary" size="sm" onPress={() => setConfirm('delete')}>
            {t('stf.delete')}
          </Button>
        ) : canPublish && m.status === 'active' ? (
          <Button variant="tertiary" size="sm" onPress={() => setConfirm('archive')}>
            {t('stf.archive')}
          </Button>
        ) : null}
      </View>
      <ConfirmDialog
        visible={!!confirm}
        kind={confirm ?? 'archive'}
        item={m.filename}
        loading={busy}
        affects={[t('confirm.audit')]}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && call(`/v1/staff/media/${m.id}/${confirm}`, 'POST', { version: m.version })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: space['3'], alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'], alignItems: 'center' },
});
