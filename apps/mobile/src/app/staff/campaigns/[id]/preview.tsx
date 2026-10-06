import { entitySchema, type Offer } from '@nano/contracts';
import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Banner, ListGroup, ListRow, OfferCard, Skeleton, Text } from '../../../../components';
import { t } from '../../../../i18n';
import { useSettings } from '../../../../settings/useSettings';
import { useStaffQuery } from '../../../../staff/api';
import { StaffScreen } from '../../../../staff/StaffScreen';

/** `/staff/campaigns/[id]/preview` — STF-07: the draft rendered with the customer offer card. Nothing is published here. */
export default function CampaignPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useStaffQuery(['campaigns', 'item', id], `/v1/staff/campaigns/${encodeURIComponent(id ?? '')}`, entitySchema, !!id);
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const d = item.data?.draft as Omit<Offer, 'id' | 'state' | 'sample'> | undefined;
  const [nowMs] = useState(() => Date.now());
  const state: Offer['state'] = !d ? 'upcoming' : Date.parse(d.endsAt) <= nowMs ? 'expired' : Date.parse(d.startsAt) > nowMs ? 'upcoming' : 'live';
  return (
    <StaffScreen title={t('cmp.preview')} back={{ to: `/staff/campaigns/${id}` as Href, label: t('cmp.edit') }}>
      <Banner tone="info" title={t('cmp.previewNote')} />
      {d ? (
        <>
          <OfferCard offer={{ ...d, id: id ?? '', state, sample: false }} timeZone={tz} onOpen={() => undefined} onTerms={() => undefined} />
          {d.body ? <Text variant="body">{d.body}</Text> : null}
          <ListGroup header={t('offer.terms')}>
            {d.terms.map((term) => (
              <ListRow key={term} title={term} chevron={false} />
            ))}
          </ListGroup>
        </>
      ) : (
        <Skeleton lines={4} />
      )}
    </StaffScreen>
  );
}
