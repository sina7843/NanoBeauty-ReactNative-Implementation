import { entitySchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { Dialog, TextField, useToast } from '../../../components';
import { t } from '../../../i18n';
import { ApiError } from '../../../api/client';
import { problemText } from '../../../staff/api';
import { PROMO_FILTERS } from '../../../staff/filters';
import { EntityList } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/promo-codes` — STF-19. The code is the ID: chosen once, never renamed. */
export default function PromoCodes() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [asking, setAsking] = useState(false);
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [taken, setTaken] = useState(false);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function create() {
    setCreating(true);
    setTaken(false);
    try {
      const draft = { code: clean, description: clean, discount: { type: 'percent', value: 10 }, appliesTo: 'package:any', appliesLabel: 'packages', campaignId: null, startsAt: null, endsAt: null, totalLimit: null, perPerson: 1 };
      const created = entitySchema.parse((await session.authed('/v1/staff/promo-codes', { method: 'POST', body: { draft } })).body);
      setAsking(false);
      router.push(`/staff/promo-codes/${created.id}` as Href);
    } catch (e) {
      // A taken code is a 409 with the server's own sentence, not a version conflict (ST-18).
      if (e instanceof ApiError && e.code === 'conflict') setTaken(true);
      else toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setCreating(false);
    }
  }
  return (
    <StaffScreen title={t('stf.promoCodes')}>
      <EntityList plural="promo-codes" filters={PROMO_FILTERS} publishPermission="selling.publish" onCreate={() => setAsking(true)} newLabel={t('promo.new')} />
      <Dialog visible={asking} title={t('promo.new')} confirmLabel={t('promo.new')} cancelLabel={t('common.cancel')} loading={creating} onConfirm={() => (clean.length >= 3 ? create() : undefined)} onCancel={() => setAsking(false)}>
        <TextField label={t('promo.code')} helper={t('promo.codeHelp')} value={clean} onChangeText={(v) => (setCode(v), setTaken(false))} autoCapitalize="characters" maxLength={20} error={taken ? t('promo.taken') : undefined} />
      </Dialog>
    </StaffScreen>
  );
}
