import { entitySchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, Button, useToast } from '../../../components';
import { t } from '../../../i18n';
import { useSettings } from '../../../settings/useSettings';
import { problemText } from '../../../staff/api';
import { EntityList } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/support-content` — STF-10 (ADMIN 05): help-hub questions with drafts and publishing; contact details live in Clinic info. */
export default function SupportContent() {
  const router = useRouter();
  const toast = useToast();
  const { session, me } = useAuth();
  const clinic = useSettings().data?.data;
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    try {
      const draft = { title: t('art.newTitle'), body: [t('art.newBody')], onHub: true };
      const created = entitySchema.parse((await session.authed('/v1/staff/articles', { method: 'POST', body: { draft } })).body);
      router.push(`/staff/support-content/${created.id}` as Href);
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setCreating(false);
    }
  }
  return (
    <StaffScreen title={t('art.listTitle')}>
      {clinic && !clinic.settings.clinicHours ? (
        <Banner
          tone="warning"
          title={t('art.hoursMissingTitle')}
          action={
            me?.permissions.includes('clinic.manage') ? (
              <Button variant="secondary" size="sm" onPress={() => router.push('/staff/settings/clinic')}>
                {t('stf.clinicInfo')}
              </Button>
            ) : undefined
          }
        >
          {t('art.hoursMissing')}
        </Banner>
      ) : null}
      <EntityList plural="articles" basePath="/staff/support-content" publishPermission="content.publish" onCreate={create} creating={creating} newLabel={t('art.new')} />
    </StaffScreen>
  );
}
