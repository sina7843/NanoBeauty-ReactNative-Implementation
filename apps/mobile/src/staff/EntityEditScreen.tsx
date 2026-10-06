import { staffSummarySchema, type Permission } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Card, ListGroup, ListRow, Skeleton, Text } from '../components';
import { t } from '../i18n';
import { useStaffQuery } from './api';
import { EditorActions, EditorBanners } from './EditorChrome';
import { stateBadge } from './EntityList';
import { StaffScreen } from './StaffScreen';
import type { useEntityEditor } from './useEntityEditor';

type Editor = ReturnType<typeof useEntityEditor>;

/** STF-06/16/20/22/33 frame: state, shared banners, form, and the preview + actions column (TAB-01 on tablets). */
export function EntityEditScreen({
  editor,
  title,
  back,
  name,
  publishPermission,
  preview,
  extraActions,
  children,
}: {
  editor: Editor;
  title: string;
  back: { to: Href; label: string };
  name: string;
  publishPermission: Permission;
  preview?: ReactNode;
  extraActions?: ReactNode;
  children: ReactNode;
}) {
  const summary = useStaffQuery(['summary'], '/v1/staff/summary', staffSummarySchema);
  const s = editor.service;
  if (!editor.form || !s) {
    return (
      <StaffScreen title={title} back={back}>
        {editor.query.isError ? (
          <Banner tone="danger" title={t('error.title')}>
            {t('error.body')}
          </Banner>
        ) : (
          <Skeleton lines={6} media={false} />
        )}
      </StaffScreen>
    );
  }
  return (
    <StaffScreen
      title={title}
      back={back}
      aside={
        <>
          {preview}
          <View style={styles.actions}>
            <EditorActions editor={editor} name={name} secondApprover={!!summary.data?.secondApprover} publishPermission={publishPermission} />
            {extraActions}
          </View>
          {s.facts.length ? (
            <ListGroup header={t('stf.facts')}>
              {s.facts.map((f) => (
                <ListRow key={f.label} title={f.label} subtitle={f.value || undefined} />
              ))}
            </ListGroup>
          ) : null}
        </>
      }
    >
      <View style={styles.head}>
        {stateBadge(s.state)}
        {s.updatedAt ? (
          <Text variant="caption" tone="inkMuted">
            {t('svc.savedAgo', { time: new Date(s.updatedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) })}
          </Text>
        ) : null}
      </View>
      <EditorBanners editor={editor} />
      {children}
    </StaffScreen>
  );
}

/** Simple preview card used by most editors. */
export function PreviewCard({ overline, title, lines }: { overline?: string; title: string; lines: (string | null | undefined)[] }) {
  return (
    <Card>
      <Text variant="overline" tone="inkMuted">
        {overline ?? t('svc.preview')}
      </Text>
      <Text variant="titleLg">{title}</Text>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} variant="caption" tone="inkMuted" numberOfLines={4}>
          {l}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' },
  actions: { gap: space['2'] },
});
