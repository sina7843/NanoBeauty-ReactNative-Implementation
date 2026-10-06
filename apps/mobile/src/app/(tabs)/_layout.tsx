import { Tabs } from 'expo-router';
import { TabBar } from '../../components';

/** D28 Option B: Home, Treatments, Visits, Wallet. Book is an action on screens, never a tab. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="treatments" />
      <Tabs.Screen name="visits" />
      <Tabs.Screen name="wallet" />
    </Tabs>
  );
}
