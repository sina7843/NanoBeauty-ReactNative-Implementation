import { staffGiftSchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, EmptyState, ListGroup, ListRow, SearchField, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { money } from '../../../i18n/format';
import { useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/gift-cards` — find a sold gift card by recipient or the last four of its code, then act on it (STF-18). */
export default function GiftCards() {
  const router = useRouter();
  const { me } = useAuth();
  const [q, setQ] = useState('');
  const list = useStaffQuery(['gifts', q], `/v1/staff/gifts${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`, z.array(staffGiftSchema));
  return (
    <StaffScreen title={t('stf.giftCards')}>
      {me?.permissions.includes('giftcard.settings') ? (
        <ListGroup>
          <ListRow title={t('gift.settings')} onPress={() => router.push('/staff/gift-cards/settings')} />
        </ListGroup>
      ) : null}
      <SearchField value={q} onChangeText={setQ} placeholder={t('gift.search')} />
      {list.data ? (
        list.data.length ? (
          <ListGroup>
            {list.data.map((g) => (
              <ListRow
                key={g.id}
                title={`${g.reference} · ${g.recipientName ?? '—'}`}
                subtitle={[money(g.remainingCents / 100), g.voided ? t('gift.voided') : g.claimed ? t('gift.claimed') : g.delivery ? t(`gift.delivery.${g.delivery}`) : null].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/staff/gift-cards/${g.id}` as Href)}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState title={t('stf.nothingHere')} />
        )
      ) : list.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={4} media={false} />
      )}
    </StaffScreen>
  );
}
