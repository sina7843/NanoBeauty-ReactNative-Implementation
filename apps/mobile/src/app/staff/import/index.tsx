import { importSchema, type ImportField, type ImportJob } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, Button, Chip, ListGroup, ListRow, Text } from '../../../components';
import { t } from '../../../i18n';
import { problemOf } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

const FIELDS: ImportField[] = ['name', 'category', 'price', 'duration', 'description'];

/**
 * `/staff/import` — STF-41 (mapped, missing): CSV file → match columns. Nothing goes live here; every service is
 * reviewed next (STF-42). Manual entry stays available from Services.
 */
export default function ImportFile() {
  const router = useRouter();
  const { session } = useAuth();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    const file = res.canceled ? null : res.assets[0];
    if (!file) return;
    setBusy(true);
    try {
      const csv = await (await fetch(file.uri)).text();
      const created = await session.authed('/v1/staff/imports', { method: 'POST', body: { filename: file.name, csv } });
      setJob(importSchema.parse(created.body));
    } catch (e) {
      const p = problemOf(e);
      setError(p.kind === 'invalid' ? t('imp.missingBody') : t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  async function map(field: ImportField, column: string | null) {
    if (!job) return;
    try {
      const res = await session.authed(`/v1/staff/imports/${job.id}/mapping`, { method: 'PUT', body: { mapping: { ...job.mapping, [field]: column } } });
      setJob(importSchema.parse(res.body));
    } catch (e) {
      problemOf(e);
      setError(t('error.body'));
    }
  }

  return (
    <StaffScreen
      title={t('imp.title')}
      back={{ to: '/staff/services', label: t('stf.services') }}
      footer={
        job ? (
          <Button size="lg" fullWidth disabled={!!job.missingRequired.length} onPress={() => router.push({ pathname: '/staff/import/review', params: { id: job.id } })}>
            {t('imp.review', { count: job.rowCount })}
          </Button>
        ) : undefined
      }
    >
      <ListGroup header={t('imp.file')}>
        <ListRow icon="receipt" title={job ? job.filename : t('imp.pick')} subtitle={job ? t('imp.rows', { count: job.rowCount }) : undefined} onPress={busy ? undefined : pick} />
      </ListGroup>
      {busy ? <Banner tone="info" title={t('common.loading')} /> : null}
      {error ? <Banner tone="danger" title={t('error.title')}>{error}</Banner> : null}
      {job ? (
        <>
          <Text variant="headline">{t('imp.columns')}</Text>
          {FIELDS.map((f) => (
            <View key={f} style={styles.field}>
              <Text variant="label">{t(`imp.field.${f}`)}</Text>
              <View style={styles.chips}>
                {job.header.map((h) => (
                  <Chip key={h} selected={job.mapping[f] === h} onPress={() => map(f, h)}>
                    {h}
                  </Chip>
                ))}
                <Chip selected={!job.mapping[f]} onPress={() => map(f, null)}>
                  {t('imp.notMatched')}
                </Chip>
              </View>
            </View>
          ))}
          {job.missingRequired.map((f) => (
            <Banner key={f} tone="warning" title={t('imp.missingTitle', { field: t(`imp.field.${f}`) })}>
              {t('imp.missingBody')}
            </Banner>
          ))}
          {!job.mapping.duration ? <Banner tone="info" title={t('imp.missingTitle', { field: t('imp.field.duration') })}>{t('imp.durationMissing')}</Banner> : null}
          <Text variant="caption" tone="inkMuted">
            {t('imp.nothingLive')}
          </Text>
        </>
      ) : null}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: space['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
