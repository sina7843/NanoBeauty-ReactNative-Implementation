import { NotBuiltYet, Screen } from '../../components';
import { t } from '../../i18n';

export default function Wallet() {
  return (
    <Screen tabbed title={t('tab.wallet')}>
      <NotBuiltYet screen="WAL-01 Wallet" prompt="NANO-06" />
    </Screen>
  );
}
