import { entitySchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { useToast } from '../../../components';
import { t } from '../../../i18n';
import { problemOf } from '../../../staff/api';
import { EntityList } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/packages` — STF-15. A new package is a draft nobody can buy until it is published. */
export default function Packages() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    try {
      const draft = { name: t('pkg.new'), serviceId: null, sessions: 3, priceCents: 10000, regularCents: null, validityMonths: 12, terms: [], visibility: 'live' };
      const created = entitySchema.parse((await session.authed('/v1/staff/packages', { method: 'POST', body: { draft } })).body);
      router.push(`/staff/packages/${created.id}` as Href);
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    } finally {
      setCreating(false);
    }
  }
  return (
    <StaffScreen title={t('stf.packages')}>
      <EntityList plural="packages" publishPermission="selling.publish" onCreate={create} creating={creating} newLabel={t('pkg.new')} />
    </StaffScreen>
  );
}
