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
      {/* After the code, there's no going back into the code screen. */}
      <Stack.Screen name="consents" options={{ headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="match" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
