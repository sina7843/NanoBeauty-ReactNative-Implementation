import { space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useConsentHistory } from '../../account/queries';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { ListGroup, ListRow, Screen, Skeleton, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate, clinicDateTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';

/** `/account/privacy` — ACC-06 privacy hub: choices, consent history (PRIV 02), export and deletion. */
export default function Privacy() {
  return (
    <>
      <Stack.Screen options={{ title: t('priv.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <Hub />
        </SignInGate>
      </Screen>
    </>
  );
}

function Hub() {
  const router = useRouter();
  const { me } = useAuth();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [showHistory, setShowHistory] = useState(false);
  const history = useConsentHistory(showHistory);
  const terms = me?.consents.find((c) => c.purpose === 'terms' && c.granted);
  const offers = me?.consents.find((c) => c.purpose === 'marketing')?.granted ?? false;
  const purpose = { terms: t('priv.purpose.terms'), transactional: t('priv.purpose.transactional'), marketing: t('priv.purpose.marketing') };

  return (
    <>
      <Text variant="body" tone="inkMuted">
        {t('priv.body')}
      </Text>
      <ListGroup header={t('priv.choices')}>
        <ListRow
          icon="seal-check"
          title={t('priv.consents')}
          subtitle={
            terms
              ? t('priv.consentsSub', { version: terms.version, date: clinicDate(terms.recordedAt, zone), offers: offers ? t('priv.on') : t('priv.off') })
              : t('priv.consentsNone')
          }
          chevron={false}
          onPress={() => setShowHistory((v) => !v)}
        />
        <ListRow icon="bell" title={t('acc.notifications')} onPress={() => router.push('/account/notifications')} />
      </ListGroup>
      {showHistory ? (
        <View style={styles.history} accessibilityLabel={t('priv.history')}>
          <Text variant="label">{t('priv.history')}</Text>
          {history.data ? (
            history.data.map((c, i) => (
              <Text key={`${c.recordedAt}-${c.purpose}-${i}`} variant="caption" tone="inkMuted">
                {`${purpose[c.purpose]} · ${c.granted ? t('priv.granted') : t('priv.withdrawn')} · ${c.version} · ${clinicDateTime(c.recordedAt, zone)}`}
              </Text>
            ))
          ) : (
            <Skeleton lines={2} media={false} />
          )}
        </View>
      ) : null}
      <ListGroup header={t('priv.data')}>
        <ListRow icon="receipt" title={t('priv.policy')} onPress={() => router.push('/legal/privacy')} />
        <ListRow icon="archive" title={t('priv.export')} onPress={() => router.push('/account/data-request')} />
        <ListRow icon="trash" title={t('priv.delete')} destructive onPress={() => router.push('/account/delete')} />
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  history: { gap: space['1'], paddingHorizontal: space['4'] },
});
