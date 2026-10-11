import { settingsResultSchema } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { settingsQueryKey, useSettings } from '../settings/useSettings';
import { problemOf, type SaveProblem } from './api';

/**
 * STF-17/31/32 saves. Reads the live settings (refetched on open so the version is current), sends the version it
 * was based on, and on success refetches so every screen applies the new rules without an app update.
 */
export function useSettingsSave(path: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /** ST-10: the version the form was built from, pinned at the first edit so a background refetch can't win without a 409. */
  const pinned = useRef<number | null>(null);
  const current = settings.data?.data.version;
  const { refetch } = settings;
  useEffect(() => {
    refetch();
  }, [refetch]);
  return {
    settings: settings.data?.data ?? null,
    busy,
    problem,
    notice,
    message,
    /** Call from every edit handler. */
    pin: () => {
      if (pinned.current === null && current !== undefined) pinned.current = current;
    },
    reload: async () => {
      pinned.current = null;
      setProblem(null);
      await refetch();
    },
    save: async (body: Record<string, unknown>) => {
      if (!settings.data) return false;
      setBusy(true);
      setNotice(null);
      try {
        const res = await session.authed(path, { method: 'PUT', body: { version: pinned.current ?? settings.data.data.version, ...body } });
        setNotice(settingsResultSchema.parse(res.body).notice);
        setProblem(null);
        setMessage(null);
        pinned.current = null;
        await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
        return true;
      } catch (e) {
        const p = problemOf(e);
        setProblem(p.kind);
        setMessage(p.message);
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
