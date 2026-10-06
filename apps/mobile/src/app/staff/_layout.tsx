import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { isStaff } from '../../staff/api';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Staff stack (STF-01…14 and NANO-07 content governance). Reachable only when the server-confirmed session carries
 * a staff permission; a customer deep link lands on Home. The server still checks every request (D34).
 */
export default function StaffLayout() {
  const { status, me } = useAuth();
  const { colors } = useTheme();
  if (status === 'loading' || (status === 'signedIn' && !me)) return null;
  if (status !== 'signedIn' || !isStaff(me?.permissions)) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
