/** Money while typing (ST-13): keep the text, allow one decimal separator and two decimals; convert only on save. */
export function typeMoney(v: string): string {
  const clean = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = clean.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** Typed dollars to whole cents; empty or unreadable gives null. */
export function centsOf(v: string): number | null {
  if (v.trim() === '' || v.trim() === '.') return null;
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Stored cents to field text (4999 gives "49.99", 2500 gives "25"). */
export const dollarsText = (cents: number | null | undefined) => (cents === null || cents === undefined ? '' : String(cents / 100));
