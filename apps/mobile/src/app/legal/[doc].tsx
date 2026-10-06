import { NotBuiltYet, Screen } from '../../components';

/** ACC-11 legal documents (NANO-03). Real, maintained terms/privacy pages are a release blocker (R1, AUTH 10). */
export default function LegalDoc() {
  return (
    <Screen topInset={false}>
      <NotBuiltYet screen="ACC-11 Legal" prompt="NANO-03" />
    </Screen>
  );
}
