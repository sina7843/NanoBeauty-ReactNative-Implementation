import { NotBuiltYet, Screen } from '../../components';

/** BKG-08 Continue in Fresha — built in NANO-04. */
export default function FreshaHandoff() {
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="BKG-08 Continue in Fresha" prompt="NANO-04" />
    </Screen>
  );
}
