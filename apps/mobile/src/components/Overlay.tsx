import { radius, size as sizes, space } from '@nano/design-tokens';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { motion, useReducedMotion } from '../theme/motion';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Button, IconButton } from './Button';
import { Icon, type IconName } from './Icon';

export interface DialogProps {
  visible: boolean;
  /** A question. */
  title: string;
  /** The consequence, in money and time. */
  children?: ReactNode;
  /** The specific verb — never "OK". */
  confirmLabel: string;
  /** The safe choice; sits on the left and is never destructive. */
  cancelLabel: string;
  destructive?: boolean;
  /** While true the dialog stays open and inert until the server answers. */
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  /** Also fires for Android system Back. */
  onCancel: () => void;
}

/** Native Modal: system Back / predictive back dismisses via `onRequestClose` (= cancel). */
export function Dialog({ visible, title, children, confirmLabel, cancelLabel, destructive, loading, loadingLabel, onConfirm, onCancel }: DialogProps) {
  const { colors, elevation } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={loading ? () => undefined : onCancel}
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={[styles.dialog, { backgroundColor: colors.surfaceRaised }, elevation.overlay]}>
          <ScrollView contentContainerStyle={styles.dialogBody} bounces={false}>
            <Text variant="headline" accessibilityRole="header">
              {title}
            </Text>
            {typeof children === 'string' ? (
              <Text variant="body" tone="inkMuted">
                {children}
              </Text>
            ) : (
              children
            )}
          </ScrollView>
          <View style={styles.dialogActions}>
            <View style={styles.flex}>
              <Button variant="secondary" fullWidth disabled={loading} onPress={onCancel}>
                {cancelLabel}
              </Button>
            </View>
            <View style={styles.flex}>
              <Button variant={destructive ? 'destructive' : 'primary'} fullWidth loading={loading} loadingLabel={loadingLabel} onPress={onConfirm}>
                {confirmLabel}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type ConfirmKind = 'archive' | 'delete' | 'restore';

/** Archive / delete-draft / restore (D36). Lists what the action affects; every confirm is audited server-side. */
export function ConfirmDialog({
  kind,
  item,
  affects = [],
  ...rest
}: { kind: ConfirmKind; item: string; affects?: string[] } & Pick<DialogProps, 'visible' | 'loading' | 'onConfirm' | 'onCancel'>) {
  return (
    <Dialog
      {...rest}
      title={t(`confirm.${kind}.title`, { item })}
      confirmLabel={t(`confirm.${kind}.verb`)}
      cancelLabel={t('common.cancel')}
      destructive={kind !== 'restore'}
    >
      <View style={styles.confirmBody}>
        <Text variant="body" tone="inkMuted">
          {t(`confirm.${kind}.body`)}
        </Text>
        {affects.map((line) => (
          <View key={line} style={styles.affect}>
            <Icon name="info" size={16} tone="info" />
            <Text variant="body" style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
        <Text variant="caption" tone="inkMuted">
          {t('confirm.audit')}
        </Text>
      </View>
    </Dialog>
  );
}

/**
 * Body of a native sheet route (Expo Router `presentation: 'formSheet'`): iOS page sheet with detents,
 * Android modal bottom sheet; swipe-down and system Back are native. Surface is opaque `surfaceRaised`.
 */
export function Sheet({ title, children, actions, onClose }: { title: string; children: ReactNode; actions?: ReactNode; onClose?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, paddingBottom: Math.max(insets.bottom, space['6']) }]}>
      <View style={styles.sheetHead}>
        <Text variant="titleLg" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {onClose ? <IconButton icon="x" label={t('common.close')} variant="tonal" onPress={onClose} /> : null}
      </View>
      <View style={styles.sheetBody}>{children}</View>
      {actions ? <View style={styles.sheetActions}>{actions}</View> : null}
    </View>
  );
}

type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onPress: () => void };
}
const TOAST_ICON: Record<Exclude<ToastTone, 'neutral'>, IconName> = {
  success: 'check-circle',
  warning: 'warning',
  danger: 'warning-circle',
  info: 'info',
};
const TOAST_MS = 4000;

const ToastContext = createContext<((toast: Omit<ToastMessage, 'id'>) => void) | null>(null);

/**
 * Brief note after a small, reversible action. NEVER for booking, payment or balance outcomes — those
 * need an AsyncStatus screen with a reference. Announced politely; does not take focus.
 */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

export function ToastProvider({ children, bottomOffset = sizes.tabbarHeight }: { children: ReactNode; bottomOffset?: number }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);
  const show = useCallback((next: Omit<ToastMessage, 'id'>) => {
    setToast({ ...next, id: ++seq.current });
    AccessibilityInfo.announceForAccessibility(next.message);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} bottomOffset={bottomOffset} onDone={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, bottomOffset, onDone }: { toast: ToastMessage; bottomOffset: number; onDone: () => void }) {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animate = (to: number, ease: (v: number) => number) =>
      Animated.timing(progress, {
        toValue: to,
        duration: reduced ? motion.duration.reduced : motion.duration.reveal,
        easing: ease,
        useNativeDriver: true,
      });
    animate(1, motion.ease.enter).start();
    const timer = setTimeout(() => animate(0, motion.ease.exit).start(onDone), TOAST_MS);
    return () => clearTimeout(timer);
  }, [progress, reduced, onDone]);

  const translateY = reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
      style={[styles.toastWrap, { bottom: insets.bottom + bottomOffset + space['4'], opacity: progress, transform: [{ translateY }] }]}
    >
      <View style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.line }, elevation.overlay]}>
        {toast.tone !== 'neutral' ? <Icon name={TOAST_ICON[toast.tone]} size={20} tone={toast.tone} /> : null}
        <Text variant="body" style={styles.flex}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Button variant="tertiary" size="sm" onPress={toast.action.onPress}>
            {toast.action.label}
          </Button>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['5'] },
  dialog: { width: '100%', maxWidth: 340, maxHeight: '90%', borderRadius: radius.lg, padding: space['6'], gap: space['3'] },
  dialogBody: { gap: space['3'] },
  dialogActions: { flexDirection: 'row', gap: space['2'], marginTop: space['2'] },
  confirmBody: { gap: space['3'] },
  affect: { flexDirection: 'row', gap: space['2'], alignItems: 'flex-start' },
  sheet: { flex: 1, paddingTop: space['4'], paddingHorizontal: space['6'], gap: space['4'] },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space['3'] },
  sheetBody: { gap: space['3'] },
  sheetActions: { gap: space['2'] },
  toastWrap: { position: 'absolute', left: space['5'], right: space['5'] },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['3'],
    paddingVertical: space['3'],
    paddingHorizontal: space['4'],
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
