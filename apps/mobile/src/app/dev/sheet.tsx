import { useRouter } from 'expo-router';
import { Button, Sheet, Text } from '../../components';

// Showcase-only content (dev route): demonstrates the native sheet presentation.
export default function DevSheet() {
  const router = useRouter();
  return (
    <Sheet
      title="Sheet"
      onClose={() => router.back()}
      actions={
        <Button fullWidth onPress={() => router.back()}>
          Done
        </Button>
      }
    >
      <Text>Swipe down, tap Close or use system Back to dismiss.</Text>
    </Sheet>
  );
}
