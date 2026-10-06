import { entitySchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { useToast } from '../../../components';
import { t } from '../../../i18n';
import { problemOf } from '../../../staff/api';
import { EntityList } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/professionals` — STF-21. Rows show consent status; hidden people keep their name on booked visits. */
export default function Professionals() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    try {
      const draft = { name: t('pro.new'), title: null, bio: null, photo: null, consent: false, visible: true };
      const created = entitySchema.parse((await session.authed('/v1/staff/professionals', { method: 'POST', body: { draft } })).body);
      router.push(`/staff/professionals/${created.id}` as Href);
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    } finally {
      setCreating(false);
    }
  }
  return (
    <StaffScreen title={t('stf.professionals')}>
      <EntityList plural="professionals" publishPermission="professionals.publish" onCreate={create} creating={creating} newLabel={t('pro.new')} />
    </StaffScreen>
  );
}
