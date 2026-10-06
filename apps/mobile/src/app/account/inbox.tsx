import { NotBuiltYet, Screen } from '../../components';

/** ACC-04 Inbox — built in NANO-05. */
export default function Inbox() {
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="ACC-04 Inbox" prompt="NANO-05" />
    </Screen>
  );
}
