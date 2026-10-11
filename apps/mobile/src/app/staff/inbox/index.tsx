import { inboxRowSchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { Banner, EmptyState, ListGroup, ListRow, SegmentedControl, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { calendarDate } from '../../../i18n/format';
import { useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** STF-29 filter set (ST-21): one chip per status, filtered on this phone from the full list. */
const FILTERS = ['new', 'in_progress', 'waiting', 'done'] as const;
const LABEL = { new: 'inbox.status.new', in_progress: 'inbox.status.in_progress', waiting: 'inbox.waiting', done: 'inbox.status.done' } as const;

/** `/staff/inbox` — STF-29: Ask-us questions from customers. */
export default function Inbox() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('new');
  const all = useStaffQuery(['inbox', 'all'], '/v1/staff/inbox?status=all', z.array(inboxRowSchema));
  const list = { ...all, data: all.data?.filter((m) => m.status === filter) };
  return (
    <StaffScreen title={t('stf.inbox')}>
      <SegmentedControl label={t('stf.inbox')} options={FILTERS.map((f) => t(LABEL[f]))} value={t(LABEL[filter])} onChange={(v) => setFilter(FILTERS.find((f) => t(LABEL[f]) === v)!)} />
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
