import { entityPublishResultSchema, entitySchema, type Entity } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useIsOnline } from '../lib/network';
import { mergeDraft } from './mergeDraft';
import { problemOf, useStaffQuery, type SaveProblem } from './api';

/** Staff API path segment per draftable kind (NANO-08). */
export type EntityPlural = 'packages' | 'campaigns' | 'promo-codes' | 'professionals' | 'policies' | 'articles';

const localKey = (plural: string, id: string) => `nano.staff.unsaved.${plural}.${id}`;

/**
 * The NANO-07 editor model for packages, campaigns, promo codes, professionals and policies: every write sends the
 * version it was based on; 409 shows the conflict state (no force-save); offline is read only; a failed save keeps
 * the edits on this phone.
 */
export function useEntityEditor<D extends Record<string, unknown>>(plural: EntityPlural, id: string | undefined) {
  const { session } = useAuth();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const path = `/v1/staff/${plural}/${encodeURIComponent(id ?? '')}`;
  const query = useStaffQuery([plural, 'item', id], path, entitySchema, !!id);
  const [form, setForm] = useState<D | null>(null);
  const [base, setBase] = useState<Entity | null>(null);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'submit' | 'action'>(null);

  useEffect(() => {
    if (!query.data || base) return;
    const server = query.data;
    AsyncStorage.getItem(localKey(plural, server.id))
      .catch(() => null)
      .then((raw) => {
        let local: { version: number; draft: D } | null = null;
        try {
          local = raw ? (JSON.parse(raw) as { version: number; draft: D }) : null;
        } catch {
          local = null;
        }
        setBase(server);
        if (local && local.version === server.version) {
          setForm(local.draft);
          setRestored(true);
        } else setForm(server.draft as D);
      });
  }, [query.data, base, plural]);

  const apply = useCallback(
    (next: Entity) => {
      setBase(next);
      setForm(next.draft as D);
      setProblem(null);
      setMessage(null);
      setRestored(false);
      AsyncStorage.removeItem(localKey(plural, next.id)).catch(() => undefined);
      queryClient.setQueryData(['staff', plural, 'item', next.id], next);
      queryClient.invalidateQueries({ queryKey: ['staff', plural, 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'summary'] });
    },
    [queryClient, plural],
  );

  async function run<T>(kind: 'save' | 'publish' | 'submit' | 'action', call: () => Promise<T>): Promise<T | null> {
    if (!base || !form) return null;
    setBusy(kind);
    try {
      return await call();
    } catch (e) {
      const p = problemOf(e);
      setProblem(p.kind);
      setMessage(p.message);
      if (p.kind !== 'conflict') await AsyncStorage.setItem(localKey(plural, base.id), JSON.stringify({ version: base.version, draft: form })).catch(() => undefined);
      return null;
    } finally {
      setBusy(null);
    }
  }

  const dirty = !!form && !!base && JSON.stringify(form) !== JSON.stringify(base.draft);

  // Same as the service editor (ST-2): a newer server copy in the shared cache is folded in, never silently lost.
  useEffect(() => {
    const server = query.data;
    if (!server || !base || !form || server.version <= base.version) return;
    if (!dirty) {
      // Syncing from the shared query cache (an external store) is what this effect is for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBase(server);
      setForm(server.draft as D);
      return;
    }
    const m = mergeDraft(base.draft as D, form, server.draft as D);
    if (m.conflict) setProblem('conflict');
    else {
      setBase(server);
      setForm(m.draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  async function saveIfNeeded(): Promise<Entity | null> {
    if (!dirty) return base;
    const res = await session.authed(`/v1/staff/${plural}/${base!.id}/draft`, { method: 'PUT', body: { version: base!.version, draft: form } });
    const next = entitySchema.parse(res.body);
    apply(next);
    return next;
  }

  return {
    query,
    service: base,
    form,
    setForm: (patch: Partial<D>) => setForm((f) => (f ? { ...f, ...patch } : f)),
    dirty,
    problem: online === false ? ('offline' as const) : problem,
    readOnly: online === false,
    message,
    restored,
    busy,
    save: () => run('save', saveIfNeeded),
    submit: () =>
      run('submit', async () => {
        const saved = await saveIfNeeded();
        const res = await session.authed(`/v1/staff/${plural}/${saved!.id}/submit`, { method: 'POST', body: { version: saved!.version } });
        apply(entitySchema.parse(res.body));
        return 'submitted' as const;
      }),
    publish: () =>
      run('publish', async () => {
        const saved = await saveIfNeeded();
        const res = await session.authed(`/v1/staff/${plural}/${saved!.id}/publish`, { method: 'POST', body: { version: saved!.version } });
        const out = entityPublishResultSchema.parse(res.body);
        apply(out.entity);
        return out.outcome;
      }),
    /** Lifecycle actions that return the entity (campaign pause / resume / end). Nothing is shown until the server answers. */
    action: (name: string) =>
      run('action', async () => {
        const res = await session.authed(`/v1/staff/${plural}/${base!.id}/${name}`, { method: 'POST', body: { version: base!.version } });
        const next = entitySchema.parse(res.body);
        apply(next);
        return next;
      }),
    loadLatest: async () => {
      if (id) await AsyncStorage.removeItem(localKey(plural, id)).catch(() => undefined);
      await query.refetch();
      setBase(null);
      setForm(null);
      setProblem(null);
    },
  };
}
