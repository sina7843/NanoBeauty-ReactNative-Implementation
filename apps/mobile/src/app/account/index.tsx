import { NotBuiltYet, Screen } from '../../components';

/** Profile button target (pushed with the native header: chevron + label on iOS, arrow on Android). */
export default function Account() {
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="ACC-01 Account" prompt="NANO-05" />
    </Screen>
  );
}
