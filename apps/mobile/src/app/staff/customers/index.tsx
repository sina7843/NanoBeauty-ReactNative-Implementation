import { customerRowSchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { Banner, EmptyState, ListGroup, ListRow, SearchField, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { calendarDate } from '../../../i18n/format';
import { useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/customers` — STF-26. Phone numbers are masked; search by name or the number's digits. */
export default function Customers() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const list = useStaffQuery(['customers', q], `/v1/staff/customers?q=${encodeURIComponent(q.trim())}`, z.array(customerRowSchema));
  return (
    <StaffScreen title={t('stf.customers')}>
      <SearchField value={q} onChangeText={setQ} placeholder={t('cust.search')} />
      {list.data ? (
        list.data.length ? (
          <ListGroup>
            {list.data.map((c) => (
              <ListRow key={c.id} title={c.name ?? c.phone} subtitle={[c.name ? c.phone : null, c.lastVisit ? calendarDate(c.lastVisit.slice(0, 10)) : null].filter(Boolean).join(' · ')} onPress={() => router.push(`/staff/customers/${c.id}` as Href)} />
            ))}
          </ListGroup>
        ) : (
          <EmptyState title={t('cust.none')} />
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
