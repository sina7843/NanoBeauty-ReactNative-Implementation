import { t } from '../../../i18n';
import { EntityList } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/policies` — STF-33. A fixed set of policies; each publish adds a version customers see. */
export default function Policies() {
  return (
    <StaffScreen title={t('stf.policies')}>
      <EntityList plural="policies" publishPermission="policies.publish" archivable={false} />
    </StaffScreen>
  );
}
