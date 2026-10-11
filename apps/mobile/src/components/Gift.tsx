import { radius, space } from '@nano/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

/** bundle.js `GIFT_TONES`: colour + icon faces stay the v1 look until the clinic supplies artwork (D-QA-05). */
export const GIFT_TONES: Record<string, readonly [string, IconName]> = {
  birthday: ['#65568A', 'gift'],
  thanks: ['#1F6A6E', 'sparkle'],
  holiday: ['#A8322D', 'star'],
  love: ['#8A5A12', 'sparkle'],
  congrats: ['#463E55', 'star'],
  selfcare: ['#3C5A8A', 'sparkle'],
};
const DEFAULT_TONE = ['#463E55', 'gift'] as const;
export const giftTone = (key: string): readonly [string, IconName] => GIFT_TONES[key] ?? DEFAULT_TONE;

export interface GiftDesignOption {
  key: string;
  name: string;
}

/**
 * Gift design radio group (WAL-13): three columns, colour faces (ratio 1.58) with a white icon and caption, the
 * selected one in a 2 px primary ring with a check-circle badge. `loading` shows a spinner on every face.
 */
export function GiftDesignPicker({
  designs,
  selected,
  loading,
  onSelect,
}: {
  designs: GiftDesignOption[];
  selected?: string | null;
  loading?: boolean;
  onSelect?: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('giftui.designLabel')} style={styles.grid}>
      {designs.map((design) => {
        const [tone, icon] = giftTone(design.key);
        const on = selected === design.key;
        return (
          <View key={design.key} style={styles.cell}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !!loading }}
              accessibilityLabel={loading ? t('giftui.loadingDesign') : design.name}
              disabled={loading}
              onPress={() => onSelect?.(design.key)}
              style={[styles.item, { borderColor: on ? colors.primary : 'transparent' }]}
            >
              <View style={[styles.face, { backgroundColor: loading ? colors.surfaceMuted : tone }]}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.inkMuted} />
                ) : (
                  <>
                    <Icon name={icon} size={22} color="#FFFFFF" />
                    <Text variant="caption" strong numberOfLines={1} style={styles.label}>
                      {design.name}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
            {on ? (
              <View pointerEvents="none" style={[styles.check, { backgroundColor: colors.bg }]}>
                <Icon name="check-circle" size={18} tone="primary" />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  // Three columns: (100% - 2 gaps) / 3.
  cell: { width: '31.5%', flexGrow: 1 },
  item: { padding: 3, borderRadius: radius.md, borderWidth: 2 },
  face: { aspectRatio: 1.58, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: space['1'] },
  label: { color: '#FFFFFF' },
  check: { position: 'absolute', top: -6, right: -6, borderRadius: radius.full },
});
