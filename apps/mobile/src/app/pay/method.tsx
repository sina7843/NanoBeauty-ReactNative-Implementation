import { Stack } from 'expo-router';
import { NotBuiltYet, Screen } from '../../components';

export default function PayMethod() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen topInset={false}>
        <NotBuiltYet screen="PAY-01 Payment method" prompt="NANO-06" />
      </Screen>
    </>
  );
}
