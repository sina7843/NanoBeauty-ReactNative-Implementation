import { OTP_LENGTH, type MatchResult } from '@nano/contracts';
import { radius, size as sizes, space } from '@nano/design-tokens';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { t } from '../i18n';
import { otpInputProps } from '../platform/otp';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from './Badge';
import { Banner } from './Banner';
import { Button } from './Button';
import { ListGroup, ListRow } from './Card';
import { Icon, type IconName } from './Icon';
import { EmptyState } from './Status';

export interface OTPInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Fires when the last digit arrives (autofill or typing). */
  onComplete?: (code: string) => void;
  error?: string;
  sentTo?: string;
  /** Seconds until resend is allowed; 0 shows the Resend action. */
  resendIn?: number;
  onResend?: () => void;
  disabled?: boolean;
}

/**
 * One real input with one-time-code autofill (iOS Messages suggestion, Android SMS Retriever); the cells
 * are visual only. Paste fills every cell. On error the digits stay so one can be corrected. No shaking.
 */
export function OTPInput({ value, onChange, onComplete, error, sentTo, resendIn, onResend, disabled }: OTPInputProps) {
  const { colors, type } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');
  const active = Math.min(value.length, OTP_LENGTH - 1);
  return (
    <View style={styles.otp}>
      <Text variant="label">{t('aut.code.label')}</Text>
      {sentTo ? (
        <Text variant="caption" tone="inkMuted">
          {t('aut.code.sentTo', { sentTo })}
        </Text>
      ) : null}
      <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.cells}>
        {digits.map((digit, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.danger : focused && i === active ? colors.focus : colors.lineStrong,
                borderWidth: error || (focused && i === active) ? 2 : 1.5,
              },
            ]}
          >
            <Text variant="amount" style={styles.tabular}>
              {digit}
            </Text>
          </View>
        ))}
        <TextInput
          ref={input}
          {...otpInputProps}
          value={value}
          editable={!disabled}
          autoFocus
          maxLength={OTP_LENGTH}
          accessibilityLabel={t('aut.code.label')}
          accessibilityHint={error ?? (sentTo ? t('aut.code.sentTo', { sentTo }) : undefined)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            const code = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
            onChange(code);
            if (code.length === OTP_LENGTH) onComplete?.(code);
          }}
          // Invisible but present (not opacity 0) so iOS still offers the code above the keyboard.
          style={[StyleSheet.absoluteFill, type('body'), styles.hiddenInput]}
          caretHidden
        />
      </Pressable>
      {error ? (
        <View accessibilityLiveRegion="assertive" style={styles.message}>
          <Icon name="warning-circle" size={16} tone="danger" />
          <Text variant="caption" tone="danger" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : resendIn != null ? (
        resendIn > 0 ? (
          <Text variant="caption" tone="inkMuted" accessibilityLiveRegion="polite">
            {t('aut.code.resendIn', { seconds: String(resendIn).padStart(2, '0') })}
          </Text>
        ) : (
          <Button variant="tertiary" size="sm" onPress={onResend}>
            {t('aut.code.resend')}
          </Button>
        )
      ) : null}
    </View>
  );
}

export interface ConsentRowProps {
  label: string;
  required?: boolean;
  /** Optional consent is always false by default — never pre-selected (AUTH 09). */
  checked: boolean;
  onChange: (checked: boolean) => void;
  detail?: string;
  linkLabel?: string;
  onLink?: () => void;
  error?: string;
}

/** One checkbox per consent purpose; terms, transactional texts and marketing are separate records. */
export function ConsentRow({ label, required, checked, onChange, detail, linkLabel, onLink, error }: ConsentRowProps) {
  const { colors } = useTheme();
  const tag = required ? t('consent.required') : t('consent.optional');
  return (
    <View style={styles.consent}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${label}, ${tag}`}
        accessibilityHint={detail}
        onPress={() => onChange(!checked)}
        style={styles.consentMain}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: error ? colors.danger : checked ? colors.primary : colors.lineStrong,
              backgroundColor: checked ? colors.primary : colors.surface,
            },
          ]}
        >
          {checked ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
        </View>
        <View style={styles.flex}>
          <Text variant="body">
            {label}{' '}
            <Text
              variant="caption"
              tone={required ? 'onTint' : 'inkMuted'}
              style={[styles.tag, { backgroundColor: required ? colors.surfaceTint : colors.surfaceMuted }]}
            >{` ${tag} `}</Text>
          </Text>
          {detail ? (
            <Text variant="caption" tone="inkMuted">
              {detail}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {linkLabel && onLink ? (
        <View style={styles.consentLink}>
          <Button variant="tertiary" size="sm" onPress={onLink}>
            {linkLabel}
          </Button>
        </View>
      ) : null}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const MATCH_ICON: Record<MatchResult['items'][number]['kind'], IconName> = {
  visit: 'calendar-check',
  package: 'package',
  giftCard: 'gift',
  credit: 'wallet',
};

export interface AccountMatchProps {
  result: MatchResult;
  busy?: 'primary' | 'secondary' | null;
  onPrimary: () => void;
  onSecondary: () => void;
}

/**
 * AUT-05 matched · AUT-06 mismatch · AUT-07 not found. Never merges on a partial match; mismatches go to
 * assisted recovery with the clinic; records shown are labelled Sample until real data is connected.
 */
export function AccountMatch({ result, busy = null, onPrimary, onSecondary }: AccountMatchProps) {
  const { colors } = useTheme();
  const actions = (primary: string, secondary: string, primaryIcon?: IconName) => (
    <View style={styles.actions}>
      <Button fullWidth icon={primaryIcon} loading={busy === 'primary'} disabled={busy !== null} onPress={onPrimary}>
        {primary}
      </Button>
      <Button variant="tertiary" fullWidth loading={busy === 'secondary'} disabled={busy !== null} onPress={onSecondary}>
        {secondary}
      </Button>
    </View>
  );
  if (result.state === 'matched') {
    return (
      <View style={styles.match}>
        {result.sample ? <Badge tone="sample">{t('aut.match.sample')}</Badge> : null}
        <View style={[styles.matchIcon, { backgroundColor: colors.successSoft }]}>
          <Icon name="seal-check" size={28} tone="success" />
        </View>
        <Text variant="titleMd" accessibilityRole="header">
          {t('aut.match.found.title')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('aut.match.found.body')}
        </Text>
        <ListGroup>
          {result.items.map((item) => (
            <ListRow key={item.title} icon={MATCH_ICON[item.kind]} title={item.title} value={item.value ?? undefined} chevron={false} />
          ))}
        </ListGroup>
        {actions(t('aut.match.found.ok'), t('aut.match.found.missing'))}
      </View>
    );
  }
  if (result.state === 'mismatch') {
    return (
      <View style={styles.match}>
        <Banner tone="warning" title={t('aut.match.mismatch.title')}>
          {t('aut.match.mismatch.body')}
        </Banner>
        {actions(t('aut.match.mismatch.ask'), t('aut.match.mismatch.new'), 'chat-circle-text')}
      </View>
    );
  }
  return (
    <EmptyState icon="identification-card" title={t('aut.match.none.title')} actions={actions(t('aut.match.none.new'), t('aut.match.none.had'))}>
      {t('aut.match.none.body')}
    </EmptyState>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  otp: { gap: space['2'] },
  cells: { flexDirection: 'row', gap: space['2'] },
  cell: { flex: 1, minHeight: sizes.controlLg, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { color: 'transparent', opacity: 0.02 },
  message: { flexDirection: 'row', gap: space['1'], alignItems: 'flex-start' },
  consent: { paddingVertical: space['3'], gap: space['1'] },
  consentMain: { flexDirection: 'row', gap: space['3'], alignItems: 'flex-start', minHeight: sizes.touchMin },
  consentLink: { paddingLeft: 24 + space['3'] },
  tag: { borderRadius: radius.xs, overflow: 'hidden' },
  box: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  match: { gap: space['3'] },
  matchIcon: { width: 64, height: 64, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: space['2'], marginTop: space['2'] },
});
