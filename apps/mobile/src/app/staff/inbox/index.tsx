import { inboxRowSchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { Banner, EmptyState, ListGroup, ListRow, SegmentedControl, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { calendarDate } from '../../../i18n/format';
import { useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

const FILTERS = ['open', 'done', 'all'] as const;

/** `/staff/inbox` — STF-29: Ask-us questions from customers. */
export default function Inbox() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('open');
  const list = useStaffQuery(['inbox', filter], `/v1/staff/inbox?status=${filter}`, z.array(inboxRowSchema));
  return (
    <StaffScreen title={t('stf.inbox')}>
      <SegmentedControl label={t('stf.inbox')} options={FILTERS.map((f) => t(`inbox.${f}`))} value={t(`inbox.${filter}`)} onChange={(v) => setFilter(FILTERS.find((f) => t(`inbox.${f}`) === v)!)} />
      {list.data ? (
        list.data.length ? (
          <ListGroup>
            {list.data.map((m) => (
              <ListRow
                key={m.id}
                title={`${m.customer} · ${m.topic}`}
                subtitle={[t(`inbox.status.${m.status}`), calendarDate(m.createdAt.slice(0, 10)), m.preview].join(' · ')}
                onPress={() => router.push(`/staff/inbox/${m.id}` as Href)}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState title={t('inbox.empty')} />
        )
      ) : list.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}
