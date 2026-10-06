import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';

/**
 * Opens a partner page (Fresha) in the system in-app browser and resolves when the person is back in the app.
 * iOS resolves when the sheet closes. Android resolves as soon as the Custom Tab opens, so wait for the app to
 * come back to the foreground there, otherwise the return check would start while the person is still booking.
 */
export async function openAndWaitForReturn(url: string): Promise<void> {
  let result: WebBrowser.WebBrowserResult | null = null;
  try {
    result = await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'done', enableBarCollapsing: true });
  } catch {
    return;
  }
  if (result.type !== 'opened') return;
  await new Promise<void>((resolve) => {
    let left = AppState.currentState !== 'active';
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') left = true;
      else if (left) {
        sub.remove();
        resolve();
      }
    });
  });
}
