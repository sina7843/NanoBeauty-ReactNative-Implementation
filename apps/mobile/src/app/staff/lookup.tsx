import { t } from '../../i18n';
import { StaffScreen } from '../../staff/StaffScreen';
import { ValueFinder } from '../../staff/ValueFinder';

/** `/staff/lookup` — STF-11: read-only view of a person's or a gift code's value. */
export default function Lookup() {
  return (
    <StaffScreen title={t('lookup.title')}>
      <ValueFinder redeem={false} />
    </StaffScreen>
  );
}
