import type { ColorRole } from '@nano/design-tokens';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
// Per-icon imports keep the bundle to the icons we use (the package root pulls in all of them).
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CalendarCheckIcon } from 'phosphor-react-native/src/icons/CalendarCheck';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChatCircleTextIcon } from 'phosphor-react-native/src/icons/ChatCircleText';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { ClockCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { CompassIcon } from 'phosphor-react-native/src/icons/Compass';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { FirstAidKitIcon } from 'phosphor-react-native/src/icons/FirstAidKit';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { IdentificationCardIcon } from 'phosphor-react-native/src/icons/IdentificationCard';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PackageIcon } from 'phosphor-react-native/src/icons/Package';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { ProhibitIcon } from 'phosphor-react-native/src/icons/Prohibit';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ReceiptIcon } from 'phosphor-react-native/src/icons/Receipt';
import { SealCheckIcon } from 'phosphor-react-native/src/icons/SealCheck';
import { StorefrontIcon } from 'phosphor-react-native/src/icons/Storefront';
import { TicketIcon } from 'phosphor-react-native/src/icons/Ticket';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { UserGearIcon } from 'phosphor-react-native/src/icons/UserGear';
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Names follow Phosphor (and the handover boards). Add an import + entry when a screen needs a new one.
const ICONS = {
  archive: ArchiveIcon,
  'arrow-clockwise': ArrowClockwiseIcon,
  bell: BellIcon,
  'calendar-blank': CalendarBlankIcon,
  'calendar-check': CalendarCheckIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
  'chat-circle-text': ChatCircleTextIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  clock: ClockIcon,
  'clock-counter-clockwise': ClockCounterClockwiseIcon,
  compass: CompassIcon,
  eye: EyeIcon,
  'first-aid-kit': FirstAidKitIcon,
  gift: GiftIcon,
  'hourglass-medium': HourglassMediumIcon,
  house: HouseIcon,
  'identification-card': IdentificationCardIcon,
  info: InfoIcon,
  lock: LockIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  package: PackageIcon,
  'pencil-simple': PencilSimpleIcon,
  phone: PhoneIcon,
  prohibit: ProhibitIcon,
  question: QuestionIcon,
  receipt: ReceiptIcon,
  'seal-check': SealCheckIcon,
  storefront: StorefrontIcon,
  ticket: TicketIcon,
  trash: TrashIcon,
  'user-circle': UserCircleIcon,
  'user-gear': UserGearIcon,
  wallet: WalletIcon,
  warning: WarningIcon,
  'warning-circle': WarningCircleIcon,
  'wifi-slash': WifiSlashIcon,
  x: XIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** icon-sm 16 · icon-md 20 · icon-lg 24 */
  size?: number;
  /** Fill is reserved for the selected tab (guideline 05). */
  fill?: boolean;
  /** Defaults to `ink`; pass the status role for status icons. */
  tone?: ColorRole;
  color?: string;
  /** Only when the icon stands alone and carries meaning; otherwise hidden from screen readers. */
  label?: string;
}

export function Icon({ name, size = 20, fill, tone = 'ink', color, label }: IconProps) {
  const { colors } = useTheme();
  const Component = ICONS[name];
  const glyph = <Component size={size} weight={fill ? 'fill' : 'regular'} color={color ?? colors[tone]} />;
  if (!label) {
    return (
      <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {glyph}
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      {glyph}
    </View>
  );
}
