import { Redirect, Stack, usePathname } from 'expo-router';
import { isReachable, OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';

/** Booking modal stack. Routes for the other booking mode (D33) are unreachable, even by deep link. */
export default function BookLayout() {
  const pathname = usePathname();
  const settings = useSettings();
  const mode = settings.data?.data.settings.bookingMode;
  const { colors } = useTheme();
  // Wait for real settings before judging a deep link; the hand-off default applies only once settled.
  if (settings.isPending) return null;
  if (!isReachable(pathname, mode)) return <Redirect href={OLD_LINK_HREF} />;
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
      }}
    />
  );
}
