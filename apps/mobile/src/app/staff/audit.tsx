import { auditEntrySchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { Banner, Button, Card, Chip, EmptyState, Skeleton, TextField } from '../../components';
import { t } from '../../i18n';
import { clinicDateTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';
import { useStaffQuery } from '../../staff/api';
import { AuditEntry } from '../../staff/Governance';
import { humanize } from '../../staff/readable';
import { StaffScreen } from '../../staff/StaffScreen';

const SPANS = [1, 7, 30, 90];

/** `/staff/audit` — STF-12. Read only: entries can't be edited or deleted (DB trigger); filter by time, person, item. */
export default function Audit() {
  const tz = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [days, setDays] = useState(7);
  const [person, setPerson] = useState('');
  const [item, setItem] = useState('');
  const params = new URLSearchParams({ days: String(days), ...(person.trim() ? { person: person.trim() } : {}), ...(item.trim() ? { item: item.trim() } : {}) });
  const q = useStaffQuery(['audit', days, person, item], `/v1/staff/audit?${params.toString()}`, z.array(auditEntrySchema));
  const short = (v: string | null) => (v === null ? '—' : v.length > 60 ? `${v.slice(0, 57)}…` : v);
  return (
    <StaffScreen title={t('audit.title')}>
      <View style={styles.chips}>
        {SPANS.map((d) => (
          <Chip key={d} selected={days === d} onPress={() => setDays(d)}>
            {t('audit.days', { days: d })}
          </Chip>
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={t('audit.person')} value={person} onChangeText={setPerson} autoCapitalize="words" />
        </View>
        <View style={styles.flex}>
          <TextField label={t('audit.item')} value={item} onChangeText={setItem} autoCapitalize="none" />
        </View>
      </View>
      {q.data ? (
        q.data.length ? (
          <Card>
            {q.data.map((e, i) => (
              <AuditEntry
                key={e.id}
                actor={e.actor}
                item={e.item}
                change={e.field ? t('audit.change', { field: humanize(e.field), old: short(e.oldValue), new: short(e.newValue) }) : null}
                reason={e.reason}
                time={clinicDateTime(e.at, tz)}
                last={i === q.data!.length - 1}
              />
            ))}
          </Card>
        ) : (
          <EmptyState icon="clock-counter-clockwise" title={t('audit.empty')} />
        )
      ) : q.isError ? (
        <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => q.refetch()}>{t('error.retry')}</Button>}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  row: { flexDirection: 'row', gap: space['3'] },
});
