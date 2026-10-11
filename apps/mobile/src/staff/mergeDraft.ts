/**
 * Three-way merge of a draft (ST-2): `base` is the server draft the form was built from, `local` the form, `server`
 * the newer server draft (for example after the FAQ screen saved). A field only one side changed takes that side's value;
 * a field both sides changed differently is a real conflict and nothing is merged.
 */
export function mergeDraft<D extends Record<string, unknown>>(base: D, local: D, server: D): { draft: D; conflict: boolean } {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const draft = { ...server } as Record<string, unknown>;
  for (const key of Object.keys(local)) {
    if (same(local[key], base[key])) continue; // not edited here: keep the server's value
    if (!same(server[key], base[key]) && !same(server[key], local[key])) return { draft: server, conflict: true };
    draft[key] = local[key];
  }
  return { draft: draft as D, conflict: false };
}
