import { radius, space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, ListGroup, ListRow, Screen, SearchField, Skeleton, Text, UrgentLine } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { directionsUrl, hoursLabel } from '../../content/clinic';
import { useSupportHub } from '../../content/queries';
import { t } from '../../i18n';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';

/** `/support` — SUP-01 hub: FAQ, Ask us, directions, parking, contact, urgent-care line (SUP 01, 03, 06). */
export default function SupportHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const hub = useSupportHub();
  const settings = useSettings().data?.data;
  const clinic = settings?.clinic;
  const reply = clinic?.supportReplyTime ?? null;
  const phone = clinic?.phone?.replace(/[^\d+]/g, '');
  const hours = hoursLabel(settings?.settings.clinicHours ?? null) ?? t('sup.hoursPending');

  return (
    <>
      <Stack.Screen options={{ title: t('sup.title') }} />
      <Screen topInset={false}>
        {/* SUP-01: the field opens the search screen (TRT-04), it doesn't filter this list in place. */}
        <SearchField value="" onChangeText={() => undefined} onFocus={() => router.push('/treatments/search')} placeholder={t('sup.search')} />
        <ContentGate query={hub} skeleton={<Skeleton lines={3} media={false} />}>
          {(data) =>
            data.articles.length ? (
              <ListGroup header={t('sup.common')}>
                {data.articles.map((a) => (
                  <ListRow key={a.id} title={a.title} onPress={() => router.push({ pathname: '/support/[article]', params: { article: a.id } })} />
                ))}
              </ListGroup>
            ) : null
          }
        </ContentGate>

        {reply ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('sup.askTitle')} ${t('sup.askBody', { time: reply })}`}
            onPress={() => router.push('/support/ask')}
            android_ripple={{ color: colors.surfacePressed, foreground: true }}
            style={({ pressed }) => [styles.ask, { backgroundColor: pressed ? colors.surfacePressed : colors.surfaceTint }]}
          >
            <Icon name="question" size={20} tone="onTint" />
            <View style={styles.flex}>
              <Text variant="body" strong tone="onTint">
                {t('sup.askTitle')}
              </Text>
              <Text variant="caption" tone="onTint">
                {t('sup.askBody', { time: reply })}
              </Text>
            </View>
            <Icon name="caret-right" size={20} tone="onTint" />
          </Pressable>
        ) : null}

        {clinic ? (
          <>
            <ListGroup header={t('sup.gettingHere')}>
              <ListRow icon="map-trifold" title={t('sup.directions')} subtitle={t('sup.directionsSub')} onPress={() => Linking.openURL(directionsUrl(clinic)).catch(() => undefined)} />
              <ListRow icon="car" title={t('sup.parking')} subtitle={clinic.parking ?? t('sup.parkingPending')} chevron={false} />
            </ListGroup>
            <View style={[styles.contact, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text variant="headline">{t('sup.contact')}</Text>
              <View style={styles.inline}>
                <Icon name="map-pin" size={16} tone="inkMuted" />
                <Text variant="body" style={styles.flex}>
                  {clinic.address}
                </Text>
              </View>
              <Text variant="caption" tone="inkMuted">
                {reply ? `${hours} · ${t('sup.replies', { time: reply })}` : hours}
              </Text>
              {phone ? (
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Button variant="secondary" icon="phone" fullWidth onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)}>
                      {t('sup.call')}
                    </Button>
                  </View>
                  <View style={styles.flex}>
                    <Button variant="secondary" icon="chat-circle-text" fullWidth onPress={() => router.push('/support/contact')}>
                      {t('sup.text')}
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
        <UrgentLine />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: space['1'] },
  row: { flexDirection: 'row', gap: space['2'] },
  ask: { flexDirection: 'row', alignItems: 'center', gap: space['3'], padding: space['4'], borderRadius: radius.md, minHeight: 56 },
  contact: { gap: space['2'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1 },
});
