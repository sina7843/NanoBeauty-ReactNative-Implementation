import { useLocalSearchParams } from 'expo-router';
import { t } from '../../i18n';
import { StaffScreen } from '../../staff/StaffScreen';
import { ValueFinder } from '../../staff/ValueFinder';

/** `/staff/redeem` — STF-25: find → choose → confirm → ledger entry → receipt. */
export default function Redeem() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <StaffScreen title={t('redeem.titleDesk')}>
      <ValueFinder redeem initialQuery={typeof q === 'string' ? q.slice(0, 40) : undefined} />
    </StaffScreen>
  );
}
