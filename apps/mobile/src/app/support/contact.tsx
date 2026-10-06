import { useLocalSearchParams } from 'expo-router';
import { NotBuiltYet, Screen, Text } from '../../components';
import { t } from '../../i18n';

/** SUP-03 contact (NANO-03). Arrives with the case reference from the account match (SUP 04). */
export default function SupportContact() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="SUP-03 Contact" prompt="NANO-03" />
      {reference ? (
        <Text variant="body" selectable>
          {t('async.reference', { reference })}
        </Text>
      ) : null}
    </Screen>
  );
}
