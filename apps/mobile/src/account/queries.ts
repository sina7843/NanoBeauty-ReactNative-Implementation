import {
  consentHistorySchema,
  dataRequestsResponseSchema,
  deletionPreviewSchema,
  deletionStatusSchema,
  inboxItemSchema,
  inboxResponseSchema,
  preferencesSchema,
  type DeletionStatus,
} from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

/** Personal account data: always from the server, never cached on the device (nothing here works offline). */
function useAuthed<T>(key: readonly unknown[], path: string, schema: z.ZodType<T>, enabled = true) {
  const { status, session } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: async () => schema.parse((await session.authed(path)).body),
    enabled: enabled && status === 'signedIn',
    retry: (count, error) => !(error instanceof ApiError && ['not_found', 'unauthorized', 'forbidden'].includes(error.code)) && count < 2,
  });
}

export const usePreferences = () => useAuthed(['preferences'], '/v1/me/preferences', preferencesSchema);
export const useInbox = () => useAuthed(['inbox'], '/v1/me/inbox', inboxResponseSchema);
export const useInboxItem = (id: string | undefined) => useAuthed(['inbox', id], `/v1/me/inbox/${encodeURIComponent(id ?? '')}`, inboxItemSchema, !!id);
export const useConsentHistory = (enabled: boolean) => useAuthed(['consents'], '/v1/me/consents', consentHistorySchema, enabled);
export const useDataRequest = () => useAuthed(['dataRequest'], '/v1/me/data-requests', dataRequestsResponseSchema);
export const useDeletionPreview = () => useAuthed(['deletionPreview'], '/v1/me/deletion/preview', deletionPreviewSchema);

/**
 * The deletion status token survives sign-out (ACC-10), so it is not a `nano.private.*` key. It reveals only the
 * request's state; it is dropped once the deletion is completed or cancelled and shown.
 */
const DELETION_KEY = 'nano.deletion.request';
export const saveDeletionToken = (token: string) => AsyncStorage.setItem(DELETION_KEY, token).catch(() => undefined);
export const loadDeletionToken = () => AsyncStorage.getItem(DELETION_KEY).catch(() => null);
export const forgetDeletionToken = () => AsyncStorage.removeItem(DELETION_KEY).catch(() => undefined);

export function useDeletionStatus(token: string | null) {
  return useQuery({
    queryKey: ['deletionStatus', token],
    queryFn: async (): Promise<DeletionStatus> => deletionStatusSchema.parse((await apiRequest(`/v1/privacy/deletion/${encodeURIComponent(token ?? '')}`)).body),
    enabled: !!token,
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
  });
}
