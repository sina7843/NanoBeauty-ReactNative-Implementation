import { radius, size as sizes, space } from '@nano/design-tokens';
import { useId, useState } from 'react';
import { Pressable, Switch as RNSwitch, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../platform/haptics';
import { Icon, type IconName } from './Icon';
import { hitSlopFor, OPACITY_DISABLED } from './press';

export interface TextFieldProps
  extends Pick<
    TextInputProps,
    'value' | 'onChangeText' | 'onBlur' | 'keyboardType' | 'textContentType' | 'autoComplete' | 'autoCapitalize' | 'secureTextEntry' | 'returnKeyType' | 'onSubmitEditing' | 'maxLength' | 'multiline'
  > {
  /** Always visible; never placeholder-only. */
  label: string;
  /** An example, not an instruction. */
  placeholder?: string;
  helper?: string;
  /** How to fix it ("Enter an email like name@example.com"), never "Invalid input". */
  error?: string;
  optional?: boolean;
  disabled?: boolean;
  icon?: IconName;
}

/** Validate on blur/submit, not per keystroke. Set `textContentType`/`autoComplete` (see platform/otp.ts). */
export function TextField({ label, placeholder, helper, error, optional, disabled, icon, ...input }: TextFieldProps) {
  const { colors, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const messageId = useId();
  const border = error ? colors.danger : focused ? colors.focus : colors.lineStrong;
  return (
    <View style={styles.field}>
      <Text variant="label" tone={disabled ? 'inkDisabled' : 'ink'}>
        {label}
        {optional ? <Text variant="label" tone="inkMuted">{` ${t('field.optional')}`}</Text> : null}
      </Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: disabled ? colors.surfaceMuted : colors.surface,
            borderColor: disabled ? colors.line : border,
            borderWidth: error || focused ? 2 : 1.5,
          },
        ]}
      >
        {icon ? <Icon name={icon} size={20} tone="inkMuted" /> : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          aria-describedby={helper || error ? messageId : undefined}
          aria-invalid={!!error}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[type('bodyLg'), styles.input, input.multiline && styles.multiline, { color: disabled ? colors.inkDisabled : colors.ink }]}
        />
      </View>
      {error ? (
        <View nativeID={messageId} accessibilityLiveRegion="assertive" style={styles.message}>
          <Icon name="warning-circle" size={16} tone="danger" />
          <Text variant="caption" tone="danger" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text nativeID={messageId} variant="caption" tone="inkMuted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export interface SwitchProps {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  /** Required transactional messages: shows "Always on" instead of a switch that can't move. */
  locked?: boolean;
}

/** Native switch, brand tint (never Android dynamic colour). Saves immediately; reversible. */
export function Switch({ label, detail, value, onValueChange, disabled, locked }: SwitchProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, disabled && { opacity: OPACITY_DISABLED }]}>
      <View style={styles.flex}>
        <Text variant="body" strong>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="inkMuted">
            {detail}
          </Text>
        ) : null}
      </View>
      {locked ? (
        <View style={styles.locked} accessible accessibilityLabel={`${label}, ${t('switch.alwaysOn')}`}>
          <Icon name="lock" size={16} tone="inkMuted" />
          <Text variant="caption" tone="inkMuted">
            {t('switch.alwaysOn')}
          </Text>
        </View>
      ) : (
        <RNSwitch
          accessibilityLabel={label}
          accessibilityHint={detail}
          value={value}
          disabled={disabled}
          onValueChange={(next) => {
            haptics.selection();
            onValueChange?.(next);
          }}
          trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
          thumbColor={value ? colors.onPrimary : colors.lineStrong}
          ios_backgroundColor={colors.surfaceMuted}
        />
      )}
    </View>
  );
}

export interface ChipProps {
  children: string;
  selected?: boolean;
  count?: number;
  icon?: IconName;
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * Selected = tint fill + primary border + check mark, so selection never relies on colour alone.
 * Filters and choices pass `selected` (toggle semantics); navigation chips leave it out (button semantics).
 */
export function Chip({ children, selected: selectedProp, count, icon, disabled, onPress }: ChipProps) {
  const toggle = selectedProp !== undefined;
  const selected = selectedProp ?? false;
  const { colors } = useTheme();
  const fg = disabled ? colors.inkDisabled : selected ? colors.onTint : colors.ink;
  return (
    <Pressable
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      accessibilityState={toggle ? { checked: selected, disabled: !!disabled } : { disabled: !!disabled }}
      accessibilityLabel={count == null ? children : `${children}, ${count}`}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlopFor(sizes.controlSm)}
      android_ripple={{ color: colors.surfacePressed, foreground: true }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.surfaceTint : colors.surface,
          borderColor: disabled ? colors.line : selected ? colors.primary : colors.lineStrong,
        },
      ]}
    >
      {selected ? <Icon name="check" size={16} color={fg} /> : icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text variant="label" strong={selected} style={{ color: fg }}>
        {children}
      </Text>
      {count != null ? (
        <Text variant="label" style={[styles.tabular, { color: selected ? colors.onTint : colors.inkMuted }]}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export interface SegmentedControlProps {
  options: string[];
  value: string;
  /** Accessible group name. */
  label: string;
  onChange?: (value: string) => void;
}

/** Two to four views of the same content. Not navigation, not settings. */
export function SegmentedControl({ options, value, label, onChange }: SegmentedControlProps) {
  const { colors, elevation } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.seg, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange?.(option)}
            hitSlop={hitSlopFor(40)}
            style={[styles.segOption, selected && [{ backgroundColor: colors.surface }, elevation.card]]}
          >
            <Text variant="label" strong={selected} tone={selected ? 'ink' : 'inkMuted'} style={styles.center}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  field: { gap: space['2'] },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['2'],
    minHeight: sizes.controlMd,
    paddingHorizontal: space['4'],
    borderRadius: radius.md,
  },
  input: { flex: 1, paddingVertical: space['2'] },
  multiline: { minHeight: 96, maxHeight: 200, textAlignVertical: 'top', paddingTop: space['3'] },
  message: { flexDirection: 'row', gap: space['1'], alignItems: 'flex-start' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space['4'], paddingVertical: space['3'], minHeight: sizes.touchMin },
  locked: { flexDirection: 'row', alignItems: 'center', gap: space['1'] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['1'],
    minHeight: sizes.controlSm,
    paddingHorizontal: space['4'],
    borderRadius: radius.full,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  seg: { flexDirection: 'row', padding: space['1'], borderRadius: radius.full },
  segOption: { flex: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: space['2'], borderRadius: radius.full },
});
