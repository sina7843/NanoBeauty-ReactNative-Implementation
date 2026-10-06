import { radius, space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Icon, type IconName, Screen, Skeleton, Text } from '../../../components';
import { t, type StringKey } from '../../../i18n';
import { giftDraft, useGiftDraft } from '../../../payments/giftDraft';
import { useSettings } from '../../../settings/useSettings';
import { useTheme } from '../../../theme/ThemeProvider';

const ICONS: Record<string, IconName> = { thanks: 'star', birthday: 'gift', holiday: 'star', love: 'gift' };

/** `/wallet/gift/design` — WAL-13 (WALT 13). Designs come from settings; guests may start a gift. */
export default function GiftDesign() {
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useGiftDraft();
  const designs = useSettings().data?.data.settings.gift.designs;
  return (
    <>
      <Stack.Screen options={{ title: t('gift.title') }} />
      <Screen
        topInset={false}
        footer={
          <Button size="lg" fullWidth disabled={!draft.design} onPress={() => router.push('/wallet/gift/value')}>
            {t('pay.continue')}
          </Button>
        }
      >
        <Text variant="displayMd" accessibilityRole="header">
          {t('gift.design')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('gift.designBody')}
        </Text>
        {designs ? (
          <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={t('gift.design')}>
            {designs.map((d) => {
              const on = draft.design === d;
              const key = `gift.design.${d}` as StringKey;
              const label = t(key) === key ? d : t(key);
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={label}
                  onPress={() => giftDraft.set({ design: d })}
                  style={[styles.tile, { backgroundColor: on ? colors.surfaceTint : colors.surface, borderColor: on ? colors.primary : colors.lineStrong, borderWidth: on ? 2 : 1 }]}
                >
                  <Icon name={ICONS[d] ?? 'gift'} size={32} tone={on ? 'primary' : 'inkMuted'} />
                  <Text variant="body" strong>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Skeleton lines={2} />
        )}
        <Badge tone="sample">{t('badge.sample')}</Badge>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space['3'] },
  tile: { flexBasis: '46%', flexGrow: 1, aspectRatio: 1.4, alignItems: 'center', justifyContent: 'center', gap: space['2'], borderRadius: radius.lg },
});
