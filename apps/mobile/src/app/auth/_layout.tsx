import { Stack } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';

/** Sign-in modal stack (AUT-01…08). Native back: chevron + label on iOS, arrow + predictive back on Android. */
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        title: '',
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="phone" options={{ headerShown: false }} />
      {/* FE-1: after the code, sign-up steps can't be left half-done (no back, no swipe); Android Back asks to sign out. */}
      <Stack.Screen name="consents" options={{ headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="profile" options={{ headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="match" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
