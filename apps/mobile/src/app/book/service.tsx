import { Stack } from 'expo-router';
import { NotBuiltYet, Screen } from '../../components';

export default function BookService() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen topInset={false}>
        <NotBuiltYet screen="BKG-01 Service" prompt="NANO-04" />
      </Screen>
    </>
  );
}
