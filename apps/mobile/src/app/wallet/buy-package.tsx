import { NotBuiltYet, Screen } from '../../components';

/** WAL-07 Buy a package — built in NANO-06. */
export default function BuyPackage() {
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="WAL-07 Buy a package" prompt="NANO-06" />
    </Screen>
  );
}
