import { space } from '@nano/design-tokens';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, PhotoFrame, Screen, Skeleton, Text } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { imageFor } from '../../content/images';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';

/** "Nazanin (Naz)" → "Naz"; "Maria" → "Maria". */
const shortName = (name: string) => /\(([^)]+)\)/.exec(name)?.[1] ?? name.split(' ')[0] ?? name;

/** TRT-06 — only with the professional's written consent on file (C5); otherwise the link is treated as old. */
export default function ProfessionalProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const mode = useSettings().data?.data.settings.bookingMode ?? 'handoff';
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ContentGate query={catalog} skeleton={<Screen topInset={false}><Skeleton lines={3} /></Screen>}>
        {(data) => {
          const pro = data.professionals.find((p) => p.id === id);
          if (!pro?.profile) return <Redirect href={OLD_LINK_HREF} />;
          const performs = data.services.filter((s) => s.status === 'live' && s.professionals.includes(pro.id));
          return (
            <Screen
              topInset={false}
              footer={
                <Button
                  size="lg"
                  fullWidth
                  onPress={() => router.push((mode === 'handoff' ? `/book/how-it-works?professional=${pro.id}` : `/book/professional?professional=${pro.id}`) as Href)}
                >
                  {t('pro.bookWith', { name: shortName(pro.name) })}
                </Button>
              }
            >
              <PhotoFrame source={imageFor(pro.profile.photo)} alt={pro.name} ratio="4 / 3" />
              <View style={styles.heading}>
                {pro.sample ? <Badge tone="sample">{t('badge.sample')}</Badge> : null}
                <Text variant="displayMd" accessibilityRole="header">
                  {pro.name}
                </Text>
                {pro.profile.title ? (
                  <Text variant="body" tone="inkMuted">
                    {pro.profile.title}
                  </Text>
                ) : null}
              </View>
              {pro.profile.bio ? <Text variant="bodyLg">{pro.profile.bio}</Text> : null}
              {performs.length ? (
                <View style={styles.heading}>
                  <Text variant="overline" tone="inkMuted">
                    {t('pro.performs')}
                  </Text>
                  <View style={styles.badges}>
                    {performs.map((s) => (
                      <Badge key={s.id} tone="primary" icon={null}>
                        {s.name}
                      </Badge>
                    ))}
                  </View>
                </View>
              ) : null}
            </Screen>
          );
        }}
      </ContentGate>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space['2'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
