import Constants from 'expo-constants';
import { z } from 'zod';

const extraSchema = z.object({
  appVariant: z.enum(['development', 'staging', 'production']),
  apiUrl: z.url().nullable(),
});

export type AppEnv = { appVariant: z.infer<typeof extraSchema>['appVariant']; apiUrl: string | null };

const API_DEV_PORT = 4000;

/**
 * Validated runtime config baked in by app.config.ts. In development without EXPO_PUBLIC_API_URL the
 * API is assumed on the machine running Metro (works for simulators, emulators and LAN devices).
 */
export function readEnv(
  extra: unknown = Constants.expoConfig?.extra,
  hostUri: string | undefined = Constants.expoConfig?.hostUri,
): AppEnv {
  const parsed = extraSchema.safeParse(extra);
  if (!parsed.success) throw new Error('App config is invalid: rebuild with a valid APP_VARIANT / EXPO_PUBLIC_API_URL.');
  const { appVariant, apiUrl } = parsed.data;
  if (apiUrl) return { appVariant, apiUrl: apiUrl.replace(/\/+$/, '') };
  const host = appVariant === 'development' ? hostUri?.split(':')[0] : undefined;
  return { appVariant, apiUrl: host ? `http://${host}:${API_DEV_PORT}` : null };
}

let cached: AppEnv | undefined;

/** Lazy so a bad build config surfaces inside the root ErrorBoundary, not at import time. */
export function getEnv(): AppEnv {
  cached ??= readEnv();
  return cached;
}
