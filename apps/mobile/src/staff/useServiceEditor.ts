import { publishResultSchema, staffServiceSchema, type ServiceDraft, type StaffService } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useIsOnline } from '../lib/network';
import { problemOf, useStaffQuery, type SaveProblem } from './api';

/** Unsaved edits survive a failed save on this phone (STF-03 savefailed): staff tooling only, no customer data. */
const localKey = (id: string) => `nano.staff.unsaved.service.${id}`;

/**
 * One editor for STF-03 and STF-40. Every write sends the version it was based on; a 409 shows the conflict state
 * and nothing is overwritten (no force-save). Offline is read only.
 */
export function useServiceEditor(id: string | undefined) {
  const { session } = useAuth();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const query = useStaffQuery(['service', id], `/v1/staff/services/${encodeURIComponent(id ?? '')}`, staffServiceSchema, !!id);
  const [form, setForm] = useState<ServiceDraft | null>(null);
  const [base, setBase] = useState<StaffService | null>(null);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'submit'>(null);

  // First load (or "Load the latest"): take the server copy, unless unsaved edits from a failed save are on the phone.
  useEffect(() => {
    if (!query.data || base) return;
    const server = query.data;
    AsyncStorage.getItem(localKey(server.id))
      .catch(() => null)
      .then((raw) => {
        let local: { version: number; draft: ServiceDraft } | null = null;
        try {
          local = raw ? (JSON.parse(raw) as { version: number; draft: ServiceDraft }) : null;
        } catch {
          local = null;
        }
        setBase(server);
        if (local && local.version === server.version) {
          setForm(local.draft);
          setRestored(true);
        } else setForm(server.draft);
      });
  }, [query.data, base]);

  const apply = useCallback(
    (next: StaffService) => {
      setBase(next);
      setForm(next.draft);
      setProblem(null);
      setRestored(false);
      AsyncStorage.removeItem(localKey(next.id)).catch(() => undefined);
      queryClient.setQueryData(['staff', 'service', next.id], next);
      queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'summary'] });
    },
    [queryClient],
  );

  async function run<T>(kind: 'save' | 'publish' | 'submit', call: () => Promise<T>): Promise<T | null> {
    if (!base || !form) return null;
    setBusy(kind);
    try {
      return await call();
    } catch (e) {
      const p = problemOf(e);
      setProblem(p.kind);
      // Keep the edits on the phone; nothing was published.
      if (p.kind !== 'conflict') await AsyncStorage.setItem(localKey(base.id), JSON.stringify({ version: base.version, draft: form })).catch(() => undefined);
      return null;
    } finally {
      setBusy(null);
    }
  }

  const dirty = !!form && !!base && JSON.stringify(form) !== JSON.stringify(base.draft);

  /** Saves the draft if it changed; returns the server's version to publish/submit. */
  async function saveIfNeeded(): Promise<StaffService | null> {
    if (!dirty) return base;
    const res = await session.authed(`/v1/staff/services/${base!.id}/draft`, { method: 'PUT', body: { version: base!.version, draft: form } });
    const next = staffServiceSchema.parse(res.body);
    apply(next);
    return next;
  }

  return {
    query,
    service: base,
    form,
    setForm: (patch: Partial<ServiceDraft>) => setForm((f) => (f ? { ...f, ...patch } : f)),
    dirty,
    problem: online === false ? ('offline' as const) : problem,
    readOnly: online === false,
    restored,
    busy,
    save: () => run('save', saveIfNeeded),
    submit: () =>
      run('submit', async () => {
        const saved = await saveIfNeeded();
        const res = await session.authed(`/v1/staff/services/${saved!.id}/submit`, { method: 'POST', body: { version: saved!.version } });
        apply(staffServiceSchema.parse(res.body));
        return 'submitted' as const;
      }),
    publish: () =>
      run('publish', async () => {
        const saved = await saveIfNeeded();
        const res = await session.authed(`/v1/staff/services/${saved!.id}/publish`, { method: 'POST', body: { version: saved!.version } });
        const out = publishResultSchema.parse(res.body);
        apply(out.service);
        return out.outcome;
      }),
    /** Conflict: drop local edits and take the server's latest (the person re-applies their change). */
    loadLatest: async () => {
      if (id) await AsyncStorage.removeItem(localKey(id)).catch(() => undefined);
      await query.refetch();
      // Reset after the fresh copy is in the cache, so the load effect takes it (not the stale one).
      setBase(null);
      setForm(null);
      setProblem(null);
    },
  };
}
