import { t } from '../../i18n';
import { StaffScreen } from '../../staff/StaffScreen';
import { ValueFinder } from '../../staff/ValueFinder';

/** `/staff/redeem` — STF-25: find → choose → confirm → ledger entry → receipt. */
export default function Redeem() {
  return (
    <StaffScreen title={t('redeem.title')}>
      <ValueFinder redeem />
    </StaffScreen>
  );
}
